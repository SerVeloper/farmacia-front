<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useToastStore } from '@/application/stores/toast.store';
import { useVentaStore } from '@/application/stores/venta.store';
import {
  esConflictoReconciliacion,
  etiquetaVencimiento,
  mensajeErrorVenta,
  normalizarAlertasVencimiento,
  normalizarAsignaciones,
  normalizarResumenVencimientos,
} from '@/application/composables/useAlertasVencimiento';
import type {
  CreateVentaDto,
  VentaAlertaVencimiento,
  VentaAsignacionLote,
  VentaCatalogoProducto,
  VentaDetalle,
  VentaMetodoPago,
} from '@/domain/types/venta';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

interface CartItem {
  productoId: string;
  codigo: string;
  nombre: string;
  precioVenta: number;
  stockActual: number;
  cantidad: number;
  descuentoMonto: number;
  /** R9: avisos informativos del producto en la sucursal activa. No bloquean. */
  alertas: VentaAlertaVencimiento[];
}

interface LocalCliente {
  id: string;
  nombre: string;
  telefono: string;
  documento: string;
  nombreNormalizado: string;
  telefonoNormalizado: string;
}

type CobroMetodo = VentaMetodoPago | 'mixto';

const authStore = useAuthStore();
const toast = useToastStore();
const ventaStore = useVentaStore();

/** R1.6 / R11: conflicto de reconciliacion de saldos de lote (409). */
const conflictoReconciliacion = ref('');
/** R9: avisos post-venta de la ultima operacion confirmada. Informativos. */
const avisoVencimientos = ref<VentaAlertaVencimiento[]>([]);

const sucursalActivaId = computed(
  () => authStore.user?.sucursalActivaId || authStore.user?.sucursalId || '',
);

const searchTerm = ref('');
const cart = ref<CartItem[]>([]);
const descuentoGlobal = ref(0);
const isCobroModalOpen = ref(false);
const isClienteModalOpen = ref(false);
const isClienteDropdownOpen = ref(false);
const clienteSearchTerm = ref('');
const selectedClienteId = ref('');
const clienteValidationMessage = ref('');

const clienteForm = reactive({
  nombre: '',
  telefono: '',
  documento: '',
});

const clientesLocales = ref<LocalCliente[]>([
  buildLocalCliente({
    nombre: 'Cliente temporal',
    telefono: '',
    documento: '',
  }),
]);

selectedClienteId.value = clientesLocales.value[0]?.id || '';

const minCatalogChars = 2;

const normalizedSearchTerm = computed(() => searchTerm.value.trim());
const shouldSearchCatalog = computed(
  () => normalizedSearchTerm.value.length >= minCatalogChars,
);

const clienteSearchNormalized = computed(() =>
  normalizeText(clienteSearchTerm.value),
);

const clientesFiltrados = computed(() => {
  if (!clienteSearchNormalized.value) {
    return clientesLocales.value;
  }

  return clientesLocales.value.filter((cliente) => {
    const documentoNormalizado = normalizeText(cliente.documento);

    return (
      cliente.nombreNormalizado.includes(clienteSearchNormalized.value) ||
      cliente.telefonoNormalizado.includes(normalizePhone(clienteSearchTerm.value)) ||
      documentoNormalizado.includes(clienteSearchNormalized.value)
    );
  });
});

const cobroForm = reactive<{
  metodo: CobroMetodo;
  efectivo: number;
  montoRecibido: number;
  referencia: string;
}>({
  metodo: 'efectivo',
  efectivo: 0,
  montoRecibido: 0,
  referencia: '',
});

const subtotal = computed(() =>
  cart.value.reduce(
    (sum, item) => sum + Number(item.precioVenta || 0) * Number(item.cantidad || 0),
    0,
  ),
);

const descuentoItems = computed(() =>
  cart.value.reduce((sum, item) => sum + item.descuentoMonto, 0),
);

const total = computed(() => {
  const raw = subtotal.value - descuentoItems.value - Number(descuentoGlobal.value || 0);
  return Number(Math.max(0, raw).toFixed(2));
});

const canOpenCobro = computed(
  () =>
    !!sucursalActivaId.value &&
    cart.value.length > 0 &&
    total.value > 0,
);

const montoEfectivoCobro = computed(() => {
  if (cobroForm.metodo === 'efectivo') {
    return total.value;
  }

  if (cobroForm.metodo === 'mixto') {
    return Number(cobroForm.efectivo || 0);
  }

  return 0;
});

const montoTransferenciaCobro = computed(() => {
  if (cobroForm.metodo === 'transferencia') {
    return total.value;
  }

  if (cobroForm.metodo === 'mixto') {
    return Number(
      Math.max(0, total.value - Number(cobroForm.efectivo || 0)).toFixed(2),
    );
  }

  return 0;
});

const vueltoCobro = computed(() => {
  if (cobroForm.metodo === 'transferencia') {
    return 0;
  }

  return Number(
    Math.max(0, Number(cobroForm.montoRecibido || 0) - montoEfectivoCobro.value).toFixed(2),
  );
});

const canConfirmCobro = computed(() => {
  if (!canOpenCobro.value) {
    return false;
  }

  if (cobroForm.metodo === 'efectivo') {
    return Number(cobroForm.montoRecibido || 0) >= total.value;
  }

  if (cobroForm.metodo === 'transferencia') {
    return true;
  }

  const efectivo = Number(cobroForm.efectivo || 0);
  return (
    efectivo > 0 &&
    efectivo < total.value &&
    Number(cobroForm.montoRecibido || 0) >= efectivo
  );
});

const cobroValidationMessage = computed(() => {
  if (cobroForm.metodo === 'efectivo' && Number(cobroForm.montoRecibido || 0) < total.value) {
    return 'El monto recibido debe cubrir el total en efectivo.';
  }

  if (cobroForm.metodo === 'mixto') {
    const efectivo = Number(cobroForm.efectivo || 0);

    if (efectivo <= 0 || efectivo >= total.value) {
      return 'En pago mixto, el efectivo debe ser mayor a 0 y menor al total.';
    }

    if (Number(cobroForm.montoRecibido || 0) < efectivo) {
      return 'El monto recibido no puede ser menor al efectivo definido.';
    }
  }

  return '';
});

watch(sucursalActivaId, async (sucursalId) => {
  if (!sucursalId) return;

  cart.value = [];
  closeCobroModal();

  if (!shouldSearchCatalog.value) {
    return;
  }

  await ventaStore.fetchCatalogo({ sucursalId, q: normalizedSearchTerm.value });
});

watch(searchTerm, async () => {
  if (!sucursalActivaId.value) return;

  if (!shouldSearchCatalog.value) {
    return;
  }

  await ventaStore.fetchCatalogo({
    sucursalId: sucursalActivaId.value,
    q: normalizedSearchTerm.value,
  });
});

watch(
  () => cobroForm.metodo,
  (metodo) => {
    if (metodo === 'efectivo') {
      cobroForm.efectivo = 0;
      cobroForm.montoRecibido = total.value;
      return;
    }

    if (metodo === 'transferencia') {
      cobroForm.efectivo = 0;
      cobroForm.montoRecibido = 0;
      return;
    }

    cobroForm.efectivo = 0;
    cobroForm.montoRecibido = 0;
  },
);

function addProduct(product: VentaCatalogoProducto) {
  const productoId = product.productoId;
  const precioVenta = Number(product.precioVenta || 0);
  const stockActual = Number(product.stockActual || 0);

  // R5.2 / R9: un lote vencido NO deshabilita el producto. FEFO incluye
  // vencidos y el unico requisito de la UI es stock > 0.
  if (!productoId || stockActual <= 0) return;

  const existing = cart.value.find((item) => item.productoId === productoId);

  if (existing) {
    if (existing.cantidad < existing.stockActual) {
      existing.cantidad += 1;
    }
    existing.alertas = alertasDeProducto(product);
    return;
  }

  cart.value.push({
    productoId,
    codigo: product.codigo,
    nombre: product.nombre,
    precioVenta,
    stockActual,
    cantidad: 1,
    descuentoMonto: 0,
    alertas: alertasDeProducto(product),
  });
}

/** R9: normaliza los avisos del catalogo sin inventar cortes ni fechas. */
function alertasDeProducto(product: VentaCatalogoProducto): VentaAlertaVencimiento[] {
  return normalizarAlertasVencimiento(product.alertasVencimiento).map((alerta) => ({
    ...alerta,
    productoId: alerta.productoId || product.productoId,
    nombreProducto: alerta.nombreProducto || product.nombre,
  }));
}

function alertasDeLinea(item: CartItem): VentaAlertaVencimiento[] {
  return item.alertas.filter((alerta) => !alerta.productoId || alerta.productoId === item.productoId);
}

/** Badge informativo; nunca deshabilita la linea ni el producto. */
function etiqueta(alerta: VentaAlertaVencimiento): string {
  return etiquetaVencimiento(alerta);
}

const alertasCarrito = computed<VentaAlertaVencimiento[]>(() =>
  cart.value.flatMap((item) => alertasDeLinea(item)),
);

const totalAlertasCarrito = computed(() => alertasCarrito.value.length);

const vencidosCarrito = computed(() =>
  alertasCarrito.value.filter((alerta) => alerta.vencido || alerta.tipo === 'vencido'),
);

const resumenCarrito = computed(() =>
  normalizarResumenVencimientos(null, alertasCarrito.value),
);

function removeItem(productoId: string) {
  cart.value = cart.value.filter((item) => item.productoId !== productoId);
}

function openCobroModal() {
  if (!canOpenCobro.value) return;

  resetCobroForm();
  isCobroModalOpen.value = true;
}

function closeCobroModal() {
  isCobroModalOpen.value = false;
}

function resetCobroForm() {
  cobroForm.metodo = 'efectivo';
  cobroForm.efectivo = 0;
  cobroForm.montoRecibido = total.value;
  cobroForm.referencia = '';
}

async function confirmCobroAndSubmit() {
  if (!canConfirmCobro.value || !sucursalActivaId.value) return;

  const payload: CreateVentaDto = {
    sucursalId: sucursalActivaId.value,
    descuentoGlobal: Number(descuentoGlobal.value || 0),
    // R6: el request NO lleva lote; el backend asigna por FEFO.
    items: cart.value.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      descuentoMonto: Number(item.descuentoMonto || 0),
    })),
    pagos: buildPagos(),
  };

  conflictoReconciliacion.value = '';
  avisoVencimientos.value = [];

  let venta: VentaDetalle | null = null;

  try {
    venta = await ventaStore.createVenta(payload);
  } catch (error: unknown) {
    // R1.6 / R7: ante conflicto de reconciliacion el carrito INTACTO, porque el
    // backend garantiza rollback de venta, items, asignaciones y caja (R7).
    if (esConflictoReconciliacion(error)) {
      conflictoReconciliacion.value = mensajeErrorVenta(error);
      return;
    }
    return;
  }

  const avisos = consolidarAvisosVencimientos(venta);

  cart.value = [];
  descuentoGlobal.value = 0;
  closeCobroModal();
  resetCobroForm();

  if (shouldSearchCatalog.value) {
    await ventaStore.fetchCatalogo({
      sucursalId: sucursalActivaId.value,
      q: normalizedSearchTerm.value,
    });
  }

  avisoVencimientos.value = avisos;

  if (avisos.length > 0) {
    // R9: aviso NO bloqueante. La venta ya quedo registrada; solo se informa.
    const vencidos = avisos.filter((aviso) => aviso.vencido || aviso.tipo === 'vencido').length;
    const proximos = avisos.length - vencidos;

    toast.warning(
      [
        vencidos > 0 ? `${vencidos} lote(s) vencido(s)` : '',
        proximos > 0 ? `${proximos} proximo(s) a vencer` : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'Vencimientos informados en la venta',
    );
  }
}

/**
 * R9.3 / R9.4: consolida los avisos del resultado. Se leen tanto
 * `alertasVencimiento` como los flags R9 de `items[].asignaciones`
 * (`vencido`, `diasVencido`, `proximoVencimiento`, `diasParaVencer`).
 * Si el backend aun no devuelve nada, la lista queda vacia y no se inventa.
 */
function consolidarAvisosVencimientos(venta: VentaDetalle | null): VentaAlertaVencimiento[] {
  if (!venta) return [];

  const avisos = normalizarAlertasVencimiento(venta.alertasVencimiento);

  for (const item of venta.items ?? []) {
    const asignaciones: VentaAsignacionLote[] = normalizarAsignaciones(item);

    for (const asignacion of asignaciones) {
      const yaInformado = avisos.some(
        (alerta) => alerta.loteId && alerta.loteId === asignacion.loteId,
      );

      if (yaInformado) continue;

      avisos.push({
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        loteId: asignacion.loteId,
        numeroLote: asignacion.numeroLote,
        fechaVencimiento: asignacion.fechaVencimiento,
        cantidad: asignacion.cantidad,
        tipo: asignacion.vencido ? 'vencido' : 'proximo',
        vencido: asignacion.vencido,
        proximoVencimiento: asignacion.proximoVencimiento === true,
        diasParaVencer: asignacion.diasParaVencer,
        diasVencido: asignacion.diasVencido,
      });
    }
  }

  return avisos;
}

function cerrarAvisoVencimientos() {
  avisoVencimientos.value = [];
}

function cerrarConflictoReconciliacion() {
  conflictoReconciliacion.value = '';
}

function buildPagos(): Array<{
  metodoPago: VentaMetodoPago;
  monto: number;
  referencia?: string;
}> {
  const result: Array<{
    metodoPago: VentaMetodoPago;
    monto: number;
    referencia?: string;
  }> = [];

  if (cobroForm.metodo === 'efectivo') {
    result.push({ metodoPago: 'efectivo', monto: Number(total.value.toFixed(2)) });
    return result;
  }

  if (cobroForm.metodo === 'transferencia') {
    result.push({
      metodoPago: 'transferencia',
      monto: Number(total.value.toFixed(2)),
      referencia: cobroForm.referencia || undefined,
    });

    return result;
  }

  const efectivo = Number(montoEfectivoCobro.value.toFixed(2));
  const transferencia = Number(montoTransferenciaCobro.value.toFixed(2));

  if (efectivo > 0) {
    result.push({ metodoPago: 'efectivo', monto: efectivo });
  }

  if (transferencia > 0) {
    result.push({
      metodoPago: 'transferencia',
      monto: transferencia,
      referencia: cobroForm.referencia || undefined,
    });
  }

  return result;
}

function money(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(value || 0);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizePhone(value: string): string {
  return (value || '').replace(/\D/g, '');
}

function buildLocalCliente(input: {
  nombre: string;
  telefono: string;
  documento: string;
}): LocalCliente {
  return {
    id: crypto.randomUUID(),
    nombre: input.nombre.trim(),
    telefono: input.telefono.trim(),
    documento: input.documento.trim(),
    nombreNormalizado: normalizeText(input.nombre),
    telefonoNormalizado: normalizePhone(input.telefono),
  };
}

function selectCliente(cliente: LocalCliente) {
  selectedClienteId.value = cliente.id;
  clienteSearchTerm.value = cliente.nombre;
  isClienteDropdownOpen.value = false;
}

function openCreateClienteModal(prefillFromSearch = false) {
  clienteValidationMessage.value = '';
  isClienteDropdownOpen.value = false;

  if (prefillFromSearch) {
    clienteForm.nombre = clienteSearchTerm.value.trim();
  }

  isClienteModalOpen.value = true;
}

function onClienteSearchBlur() {
  window.setTimeout(() => {
    isClienteDropdownOpen.value = false;
  }, 150);
}

function closeCreateClienteModal() {
  isClienteModalOpen.value = false;
  clienteValidationMessage.value = '';
  clienteForm.nombre = '';
  clienteForm.telefono = '';
  clienteForm.documento = '';
}

function saveClienteLocal() {
  const nombre = clienteForm.nombre.trim();
  const telefono = clienteForm.telefono.trim();
  const documento = clienteForm.documento.trim();

  if (!nombre) {
    clienteValidationMessage.value = 'El nombre del cliente es obligatorio.';
    return;
  }

  const nombreNormalizado = normalizeText(nombre);
  const telefonoNormalizado = normalizePhone(telefono);

  const duplicado = clientesLocales.value.some(
    (cliente) =>
      cliente.nombreNormalizado === nombreNormalizado &&
      cliente.telefonoNormalizado === telefonoNormalizado,
  );

  if (duplicado) {
    clienteValidationMessage.value =
      'Ya existe un cliente con el mismo nombre y teléfono.';
    return;
  }

  const nuevoCliente = buildLocalCliente({ nombre, telefono, documento });
  clientesLocales.value.unshift(nuevoCliente);
  selectCliente(nuevoCliente);
  closeCreateClienteModal();
}
</script>

<template>
  <div class="venta-pos">
    <!-- R1.6 / R11: conflicto de reconciliacion de saldos de lote. No se desconto inventario (R7). -->
    <div v-if="conflictoReconciliacion" class="pos-banner pos-banner-error">
      <span>{{ conflictoReconciliacion }}</span>
      <button type="button" class="icon-btn" @click="cerrarConflictoReconciliacion">✕</button>
    </div>

    <!-- R9: avisos de vencimiento de la ultima venta. Informativos, no bloquean. -->
    <div v-if="avisoVencimientos.length" class="pos-banner pos-banner-warn">
      <div class="pos-banner-body">
        <strong>Avisos de vencimiento (la venta se registro)</strong>
        <span class="pos-banner-list">
          <span
            v-for="aviso in avisoVencimientos"
            :key="`${aviso.loteId}-${aviso.fechaVencimiento}-${aviso.productoId}`"
            class="alert-badge"
            :class="aviso.vencido || aviso.tipo === 'vencido' ? 'alert-badge-expired' : 'alert-badge-near'"
          >
            {{ etiqueta(aviso) }} · {{ aviso.nombreProducto }}
            <template v-if="aviso.numeroLote"> · Lote {{ aviso.numeroLote }}</template>
          </span>
        </span>
      </div>
      <button type="button" class="icon-btn" @click="cerrarAvisoVencimientos">✕</button>
    </div>

    <!-- BODY -->
    <section class="pos-body">
      <!-- LEFT PANEL -->
      <div class="panel panel-left">
        <section class="border-b border-[var(--color-border)] p-2">
          <div class="flex items-start gap-2">
            <div class="relative flex-1">
              <input
                v-model="clienteSearchTerm"
                class="pos-input"
                placeholder="Buscar cliente por nombre, teléfono o documento"
                @focus="isClienteDropdownOpen = true"
                @blur="onClienteSearchBlur"
              />

              <div
                v-if="isClienteDropdownOpen"
                class="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[220px] overflow-auto border border-[#404964] bg-[#101935]"
              >
                <button
                  v-for="cliente in clientesFiltrados"
                  :key="cliente.id"
                  type="button"
                  class="flex w-full items-start justify-between gap-2 border-b border-[#2c3653] px-2.5 py-2 text-left text-xs text-[#dbe4fb] last:border-b-0 hover:bg-[#1a2644]"
                  :class="{ 'bg-[#1a2644]': selectedClienteId === cliente.id }"
                  @click="selectCliente(cliente)"
                >
                  <div class="flex flex-col gap-0.5">
                    <strong>{{ cliente.nombre }}</strong>
                    <span class="text-[#9aa7c7]">{{ cliente.telefono || 'Sin teléfono' }}</span>
                  </div>
                  <small class="text-[#9aa7c7]">{{ cliente.documento || 'Sin documento' }}</small>
                </button>

                <button
                  v-if="clienteSearchTerm.trim() && clientesFiltrados.length === 0"
                  type="button"
                  class="flex w-full items-center border-b border-[#2c3653] px-2.5 py-2 text-left text-xs text-[#c8bfff] last:border-b-0 hover:bg-[#1a2644]"
                  @click="openCreateClienteModal(true)"
                >
                  No existe cliente para "{{ clienteSearchTerm.trim() }}". Crear cliente
                </button>
              </div>
            </div>

            <button
              type="button"
              class="search-btn w-auto px-3"
              @click="openCreateClienteModal(true)"
            >
              Crear cliente
            </button>
          </div>
        </section>

        <div class="panel-table-wrapper">
          <table class="pos-table">
            <thead>
              <tr>
                <th>STOCK</th>
                <th>CANTIDAD</th>
                <th>U.M</th>
                <th>PRODUCTO</th>
                <th>COSTO</th>
                <th>PRECIO</th>
                <th>DESCUENTO</th>
                <th>DTO.(%)</th>
                <th>SUBTOTAL</th>
                <th></th>
              </tr>
            </thead>

            <tbody v-if="cart.length === 0">
              <tr class="empty-row">
                <td colspan="10">No hay productos agregados a la venta</td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr v-for="item in cart" :key="item.productoId">
                <td>{{ item.stockActual }}</td>

                <td class="w-cantidad">
                  <input
                    v-model.number="item.cantidad"
                    type="number"
                    min="1"
                    :max="item.stockActual"
                    class="table-input"
                  />
                </td>

                <td>UND</td>

                <td class="text-left">
                  <div class="product-name">
                    {{ item.nombre }}
                    <span class="product-code">{{ item.codigo }}</span>
                  </div>
                  <!-- R9: avisos informativos. NO deshabilitan la linea (R5.2). -->
                  <div v-if="alertasDeLinea(item).length" class="alert-badges">
                    <span
                      v-for="alerta in alertasDeLinea(item)"
                      :key="`${alerta.loteId}-${alerta.fechaVencimiento}`"
                      class="alert-badge"
                      :class="alerta.vencido || alerta.tipo === 'vencido' ? 'alert-badge-expired' : 'alert-badge-near'"
                    >
                      {{ etiqueta(alerta) }}
                    </span>
                  </div>
                </td>

                <td>{{ money(0) }}</td>
                <td>{{ money(item.precioVenta) }}</td>

                <td class="w-desc">
                  <input
                    v-model.number="item.descuentoMonto"
                    type="number"
                    min="0"
                    :max="item.precioVenta * item.cantidad"
                    step="0.01"
                    class="table-input"
                  />
                </td>

                <td>
                  {{
                    item.precioVenta * item.cantidad > 0
                      ? ((item.descuentoMonto / (item.precioVenta * item.cantidad)) * 100).toFixed(2)
                      : '0.00'
                  }}
                </td>

                <td>
                  {{
                    money(item.precioVenta * item.cantidad - Number(item.descuentoMonto || 0))
                  }}
                </td>

                <td>
                  <button class="remove-btn" @click="removeItem(item.productoId)">
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- R9: resumen informativo del carrito. Nunca bloquea el cobro. -->
        <div v-if="totalAlertasCarrito > 0" class="cart-alert-strip">
          <strong>Avisos de vencimiento</strong>
          <span v-if="vencidosCarrito.length">
            {{ vencidosCarrito.length }} lote(s) vencido(s)
          </span>
          <span v-if="resumenCarrito && resumenCarrito.proximos">
            {{ resumenCarrito.proximos }} proximo(s) a vencer
          </span>
          <span class="cart-alert-note">
            La venta se registra igual: el backend asigna lotes por FEFO, incluidos los vencidos.
          </span>
        </div>

        <!-- TOTALES INFERIORES -->
        <div class="totals-strip">
          <div class="total-row">
            <span>SUBTOTAL Bs.</span>
            <strong>{{ money(subtotal) }}</strong>
          </div>
          <div class="total-row">
            <span>DTO. Bs.</span>
            <strong>{{ money(descuentoItems + Number(descuentoGlobal || 0)) }}</strong>
          </div>
          <div class="total-row">
            <span>DTO.(%)</span>
            <strong>
              {{
                subtotal > 0
                  ? (((descuentoItems + Number(descuentoGlobal || 0)) / subtotal) * 100).toFixed(4) + '%'
                  : '0.0000%'
              }}
            </strong>
          </div>
          <div class="total-row total-main">
            <span>TOTAL Bs.</span>
            <strong>{{ money(total) }}</strong>
          </div>
        </div>

        <!-- FOOTER SOLO EN PANEL IZQUIERDO -->
        <section
          class="mt-auto grid grid-cols-[1fr_220px] items-end gap-2.5 border-t border-[var(--color-border)] p-1.5 max-[1200px]:grid-cols-1"
        >
          <div class="min-w-0">
            <div class="grid grid-cols-3 gap-2 max-[1200px]:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="text-[11px] text-[var(--color-text-secondary)]">Descuento global</label>
                <input
                  v-model.number="descuentoGlobal"
                  type="number"
                  min="0"
                  :max="subtotal - descuentoItems"
                  step="0.01"
                  class="pos-input"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] text-[var(--color-text-secondary)]">Total</label>
                <input
                  :value="money(total)"
                  class="pos-input"
                  disabled
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] text-[var(--color-text-secondary)]">Items</label>
                <input
                  :value="cart.length"
                  class="pos-input"
                  disabled
                />
              </div>
            </div>
          </div>

          <div class="min-w-0">
            <button
              class="sell-btn"
              :disabled="!canOpenCobro || ventaStore.submitting"
              @click="openCobroModal"
            >
              {{ ventaStore.submitting ? 'REGISTRANDO...' : 'REALIZAR VENTA (F4)' }}
            </button>
          </div>
        </section>
      </div>

      <!-- RIGHT PANEL -->
      <div class="panel panel-right">
        <div class="border-b border-[var(--color-border)] p-1.5">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Buscar Producto"
            class="pos-input"
          />
        </div>

        <div class="panel-table-wrapper">
          <table class="pos-table">
            <thead>
              <tr>
                <th class="text-left">CÓDIGO | DESCRIPCIÓN</th>
                <th>PRECIO</th>
                <th>CANT.</th>
                <th>VNC</th>
              </tr>
            </thead>

            <tbody v-if="!shouldSearchCatalog">
              <tr class="empty-row">
                <td colspan="4">Escribe al menos 2 caracteres para buscar medicamentos</td>
              </tr>
            </tbody>

            <tbody v-else-if="ventaStore.loading">
              <tr>
                <td colspan="4" class="table-skeleton-cell">
                  <TableSkeleton :columns="4" :rows="6" />
                </td>
              </tr>
            </tbody>

            <tbody v-else-if="ventaStore.catalogo.length === 0">
              <tr class="empty-row">
                <td colspan="4">No se encontraron medicamentos</td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr
                v-for="item in ventaStore.catalogo"
                :key="item.inventarioId || item.productoId"
                class="catalog-row"
                @dblclick="addProduct(item)"
              >
                <td class="text-left">
                  <div class="catalog-product">
                    <span class="catalog-code">{{ item.codigo }}</span>
                    <span>{{ item.nombre }}</span>
                  </div>
                  <!-- R9: catalogo informa vencido / proximo vencimiento. Informativo. -->
                  <div v-if="alertasDeProducto(item).length" class="alert-badges">
                    <span
                      v-for="alerta in alertasDeProducto(item)"
                      :key="`${alerta.loteId}-${alerta.fechaVencimiento}`"
                      class="alert-badge"
                      :class="alerta.vencido || alerta.tipo === 'vencido' ? 'alert-badge-expired' : 'alert-badge-near'"
                    >
                      {{ etiqueta(alerta) }}
                    </span>
                  </div>
                </td>
                <td>{{ money(item.precioVenta) }}</td>
                <td>{{ item.stockActual }}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div
      v-if="isClienteModalOpen"
      class="modal-backdrop"
      @click.self="closeCreateClienteModal"
    >
      <div class="cliente-modal">
        <div class="cobro-header">
          <h3>Crear cliente temporal</h3>
          <button class="icon-btn" type="button" @click="closeCreateClienteModal">✕</button>
        </div>

        <div class="cobro-body">
          <div class="modal-grid cliente-modal-grid">
            <div class="payment-field field-span-2">
              <label>Nombre *</label>
              <input
                v-model="clienteForm.nombre"
                type="text"
                class="pos-input"
                placeholder="Nombre del cliente"
              />
            </div>

            <div class="payment-field">
              <label>Teléfono</label>
              <input
                v-model="clienteForm.telefono"
                type="text"
                class="pos-input"
                placeholder="Ej. 70000000"
              />
            </div>

            <div class="payment-field">
              <label>Documento</label>
              <input
                v-model="clienteForm.documento"
                type="text"
                class="pos-input"
                placeholder="CI / NIT"
              />
            </div>
          </div>

          <p v-if="clienteValidationMessage" class="validation-message">
            {{ clienteValidationMessage }}
          </p>
        </div>

        <div class="cobro-actions">
          <button
            type="button"
            class="cancel-btn"
            @click="closeCreateClienteModal"
          >
            Cancelar
          </button>

          <button type="button" class="sell-btn" @click="saveClienteLocal">
            Guardar cliente
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isCobroModalOpen"
      class="modal-backdrop"
      @click.self="closeCobroModal"
    >
      <div class="cobro-modal">
        <div class="cobro-header">
          <h3>Confirmar cobro</h3>
          <button class="icon-btn" type="button" @click="closeCobroModal">✕</button>
        </div>

        <div class="cobro-body">
          <div class="payment-methods">
            <button
              type="button"
              class="method-btn"
              :class="{ active: cobroForm.metodo === 'efectivo' }"
              @click="cobroForm.metodo = 'efectivo'"
            >
              Efectivo
            </button>
            <button
              type="button"
              class="method-btn"
              :class="{ active: cobroForm.metodo === 'transferencia' }"
              @click="cobroForm.metodo = 'transferencia'"
            >
              Transferencia
            </button>
            <button
              type="button"
              class="method-btn"
              :class="{ active: cobroForm.metodo === 'mixto' }"
              @click="cobroForm.metodo = 'mixto'"
            >
              Mixto
            </button>
          </div>

          <div class="modal-grid">
            <div class="payment-field">
              <label>Total venta</label>
              <input :value="money(total)" class="pos-input" disabled />
            </div>

            <div
              v-if="cobroForm.metodo === 'mixto'"
              class="payment-field"
            >
              <label>Efectivo</label>
              <input
                v-model.number="cobroForm.efectivo"
                type="number"
                min="0"
                :max="total"
                step="0.01"
                class="pos-input"
              />
            </div>

            <div class="payment-field">
              <label>Monto transferencia</label>
              <input
                :value="money(montoTransferenciaCobro)"
                class="pos-input"
                disabled
              />
            </div>

            <div
              v-if="cobroForm.metodo !== 'transferencia'"
              class="payment-field"
            >
              <label>Monto recibido (visual)</label>
              <input
                v-model.number="cobroForm.montoRecibido"
                type="number"
                min="0"
                step="0.01"
                class="pos-input"
              />
            </div>

            <div class="payment-field">
              <label>Vuelto (visual)</label>
              <input
                :value="money(vueltoCobro)"
                class="pos-input"
                disabled
              />
            </div>

            <div
              v-if="cobroForm.metodo !== 'efectivo'"
              class="payment-field field-span-2"
            >
              <label>Referencia transferencia (opcional)</label>
              <input
                v-model="cobroForm.referencia"
                type="text"
                class="pos-input"
                placeholder="Nro. operación / referencia"
              />
            </div>
          </div>

          <p v-if="cobroValidationMessage" class="validation-message">
            {{ cobroValidationMessage }}
          </p>
        </div>

        <div class="cobro-actions">
          <button
            type="button"
            class="cancel-btn"
            @click="closeCobroModal"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="sell-btn"
            :disabled="!canConfirmCobro || ventaStore.submitting"
            @click="confirmCobroAndSubmit"
          >
            {{ ventaStore.submitting ? 'REGISTRANDO...' : 'CONFIRMAR COBRO Y VENTA' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.venta-pos {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100vh - 90px);
  padding: 8px;
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.pos-body,
.panel {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.pos-input,
.table-input {
  width: 100%;
  height: 34px;
  background: #121b33;
  border: 1px solid #3b4663;
  color: #e7ecf7;
  font-size: 13px;
  padding: 0 10px;
  outline: none;
}

.pos-input:focus,
.table-input:focus {
  border-color: #7c5cff;
}

.icon-btn {
  width: 40px;
  height: 34px;
  background: #1a2442;
  border: 1px solid #46506f;
  color: #cfd8f3;
  cursor: pointer;
}

.pos-body {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-left,
.panel-right {
  overflow: hidden;
}

.search-btn {
  height: 34px;
  background: #6b5be6;
  color: white;
  border: 1px solid #7b6dff;
  font-size: 12px;
  cursor: pointer;
  padding: 0 10px;
  white-space: nowrap;
}

.panel-table-wrapper {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.pos-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.pos-table th,
.pos-table td {
  border-right: 1px solid #404964;
  border-bottom: 1px solid #404964;
  padding: 6px 8px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}

.pos-table th:last-child,
.pos-table td:last-child {
  border-right: none;
}

.pos-table thead th {
  background: #18233f;
  color: #f2f5fb;
  font-weight: 700;
}

.text-left {
  text-align: left !important;
}

.empty-row td {
  height: 220px;
  text-align: center;
  color: var(--color-text-secondary);
}

.product-name,
.catalog-product {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-code,
.catalog-code {
  font-size: 11px;
  color: #9aa7c7;
}

.catalog-row {
  cursor: pointer;
}

.catalog-row:hover {
  background: #1a2644;
}

.table-input {
  height: 28px;
  padding: 0 6px;
  text-align: center;
}

.remove-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #5f6b8a;
  background: transparent;
  color: #ff7a7a;
  cursor: pointer;
}

.totals-strip {
  border-top: 1px solid var(--color-border);
  padding: 6px;
  display: grid;
  gap: 4px;
  background: #16213c;
}

/* R9: avisos de vencimiento. Informativos: no deshabilitan nada. */
.alert-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  border: 1px solid transparent;
  white-space: normal;
}

.alert-badge-expired {
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(248, 113, 113, 0.55);
  color: #ffb4b4;
}

.alert-badge-near {
  background: rgba(234, 179, 8, 0.16);
  border-color: rgba(250, 204, 21, 0.55);
  color: #ffe08a;
}

.cart-alert-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-top: 1px solid var(--color-border);
  background: rgba(234, 179, 8, 0.1);
  color: #ffe08a;
  font-size: 11px;
}

.cart-alert-note {
  color: var(--color-text-secondary);
}

.pos-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
}

.pos-banner-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pos-banner-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pos-banner-error {
  background: rgba(220, 38, 38, 0.14);
  border-bottom: 1px solid rgba(248, 113, 113, 0.45);
  color: #ffb4b4;
}

.pos-banner-warn {
  background: rgba(234, 179, 8, 0.12);
  border-bottom: 1px solid rgba(250, 204, 21, 0.4);
  color: #ffe08a;
}

.total-row {
  display: grid;
  grid-template-columns: 1fr 120px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.total-row span {
  text-align: right;
  color: #dce4fa;
}

.total-row strong {
  text-align: right;
  color: #fff;
}

.total-main {
  font-size: 15px;
  font-weight: 700;
}

.payment-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payment-field label {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.field-span-2 {
  grid-column: span 2;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 13, 25, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.cobro-modal {
  width: min(760px, calc(100vw - 32px));
  border: 1px solid #46506f;
  background: #121b33;
  color: #e7ecf7;
}

.cliente-modal {
  width: min(560px, calc(100vw - 32px));
  border: 1px solid #46506f;
  background: #121b33;
  color: #e7ecf7;
}

.cliente-modal-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cobro-header {
  padding: 10px;
  border-bottom: 1px solid #404964;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cobro-header h3 {
  margin: 0;
  font-size: 15px;
}

.cobro-header .icon-btn {
  width: 34px;
}

.cobro-body {
  padding: 12px;
  display: grid;
  gap: 12px;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.method-btn {
  height: 34px;
  border: 1px solid #46506f;
  background: #1a2442;
  color: #cfd8f3;
  font-size: 12px;
  cursor: pointer;
}

.method-btn.active {
  background: #6b5be6;
  border-color: #8174ff;
  color: #fff;
}

.modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.validation-message {
  margin: 0;
  font-size: 12px;
  color: #ffb4b4;
}

.cobro-actions {
  border-top: 1px solid #404964;
  padding: 10px 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn {
  height: 38px;
  min-width: 110px;
  border: 1px solid #46506f;
  background: #1a2442;
  color: #cfd8f3;
  font-size: 12px;
  cursor: pointer;
}

.sell-btn {
  width: 100%;
  height: 38px;
  background: #6b5be6;
  color: white;
  border: 1px solid #8174ff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.sell-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-skeleton-cell {
  padding: 10px !important;
}

.w-cantidad {
  min-width: 90px;
}

.w-desc {
  min-width: 90px;
}

@media (max-width: 1200px) {
  .pos-body {
    grid-template-columns: 1fr;
  }

  .modal-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }
}
</style>
