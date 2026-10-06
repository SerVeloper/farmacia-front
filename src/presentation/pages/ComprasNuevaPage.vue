<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useCategoriaStore } from '@/application/stores/categoria.store';
import { useCompraStore } from '@/application/stores/compra.store';
import { useMarcaStore } from '@/application/stores/marca.store';
import { useUnidadMedidaStore } from '@/application/stores/unidad-medida.store';
import type {
  CompraCatalogoProducto,
  CompraPagoMetodo,
  CompraTipoComprobante,
} from '@/domain/types/compra';
import Modal from '@/presentation/components/common/Modal.vue';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';
import { esFechaVencida } from '@/application/composables/useAlertasVencimiento';

interface QuickProductForm {
  nombre: string;
  principioActivo: string;
  marcaId: string;
  categoriaId: string;
}

interface CartItem {
  productoId?: string;
  productoNuevo?: {
    nombre: string;
    principioActivo: string;
    marcaId: string;
    categoriaId: string;
  };
  codigoProducto: string;
  nombreProducto: string;
  cantidadCompra: number;
  unidadCompra: string;
  factor: number;
  costoCompraUnitario: number;
  lote: string;
  fechaVencimiento: string;
  descuentoMonto: number;
  margen: number;
  precioVenta: number;
}

const authStore = useAuthStore();
const compraStore = useCompraStore();
const categoriaStore = useCategoriaStore();
const marcaStore = useMarcaStore();
const unidadStore = useUnidadMedidaStore();

const selectedSucursalId = computed(
  () => authStore.user?.sucursalActivaId || authStore.user?.sucursalId || '',
);

const form = reactive({
  proveedorId: '',
  tipoComprobante: 'factura' as CompraTipoComprobante,
  numeroComprobante: '',
  descuentoGlobal: 0,
});

const pagos = reactive({
  efectivo: 0,
  transferencia: 0,
  referenciaTransferencia: '',
});

const cart = ref<CartItem[]>([]);
const productSearchModalOpen = ref(false);
const productSearchTerm = ref('');
const quickProductModalOpen = ref(false);
const quickProveedorModalOpen = ref(false);
const productModalOpen = ref(false);
const editingCartIndex = ref<number | null>(null);
const isSyncingModalValues = ref(false);

const previousPrices = reactive({
  costo: 0,
  margen: 0,
  precio: 0,
});

const modalItem = reactive<CartItem>({
  productoId: undefined,
  codigoProducto: '',
  nombreProducto: '',
  cantidadCompra: 1,
  unidadCompra: 'pieza',
  factor: 1,
  costoCompraUnitario: 0,
  lote: '',
  fechaVencimiento: '',
  descuentoMonto: 0,
  margen: 20,
  precioVenta: 0,
});

const quickProductForm = reactive<QuickProductForm>({
  nombre: '',
  principioActivo: '',
  marcaId: '',
  categoriaId: '',
});

const quickProveedorForm = reactive({
  nombre: '',
  nit: '',
  telefono: '',
  direccion: '',
});

const costoUnitarioModal = computed(() => {
  const factor = Number(modalItem.factor || 0);
  if (!factor || factor <= 0) return 0;
  return Number((Number(modalItem.costoCompraUnitario || 0) / factor).toFixed(4));
});

const subtotal = computed(() =>
  cart.value.reduce((sum, item) => sum + lineSubtotalBruto(item), 0),
);

const descuentoItems = computed(() =>
  cart.value.reduce((sum, item) => sum + lineDiscountApplied(item), 0),
);

const total = computed(() =>
  Number(
    Math.max(
      0,
      subtotal.value - descuentoItems.value - Number(form.descuentoGlobal || 0),
    ).toFixed(2),
  ),
);

const totalPagos = computed(() =>
  Number((Number(pagos.efectivo || 0) + Number(pagos.transferencia || 0)).toFixed(2)),
);

const saldoPendiente = computed(() =>
  Number((total.value - totalPagos.value).toFixed(2)),
);

const canSubmit = computed(
  () =>
    !!selectedSucursalId.value &&
    !!form.proveedorId &&
    !!form.numeroComprobante.trim() &&
    cart.value.length > 0 &&
    Math.abs(saldoPendiente.value) <= 0.01,
);

const itemValidationErrors = computed(() => {
  const errors: string[] = [];

  if (!modalItem.productoId && !modalItem.productoNuevo) {
    errors.push('Debes seleccionar un producto del catalogo o crear uno nuevo');
  }

  if (Number(modalItem.cantidadCompra) <= 0) {
    errors.push('La cantidad debe ser mayor a 0');
  }

  if (Number(modalItem.factor) <= 0) {
    errors.push('El factor debe ser mayor a 0');
  }

  if (Number(modalItem.costoCompraUnitario) <= 0) {
    errors.push('El costo de compra debe ser mayor a 0');
  }

  if (!modalItem.unidadCompra.trim()) {
    errors.push('Debes seleccionar una unidad de compra');
  }

  if (Number(modalItem.precioVenta) <= 0) {
    errors.push('El precio de venta debe ser mayor a 0');
  }

  // R4.1: medicamento exige numero de lote y fecha de vencimiento.
  // R4.3: una fecha pasada NO bloquea; solo se informa mas abajo.


  return errors;
});

/** R4.3: aviso informativo, nunca validacion bloqueante. */
const fechaVencimientoPasada = computed(() => {
  const fecha = modalItem.fechaVencimiento.trim();
  if (!fecha) return false;
  return esFechaVencida(fecha);
});

onMounted(async () => {
  await Promise.all([
    compraStore.fetchProveedores(),
    categoriaStore.fetchCategorias(),
    marcaStore.fetchMarcas(),
    unidadStore.fetchUnidades(),
  ]);

  if (unidadStore.unidades.length > 0) {
    modalItem.unidadCompra = unidadStore.unidades[0].abreviatura;
  }
});

watch(selectedSucursalId, async (sucursalId) => {
  if (!sucursalId) return;
  cart.value = [];
  if (productSearchModalOpen.value) {
    await compraStore.fetchCatalogo({ sucursalId, q: productSearchTerm.value.trim() });
  }
});

watch(productSearchTerm, async (q) => {
  if (!productSearchModalOpen.value || !selectedSucursalId.value) return;
  await compraStore.fetchCatalogo({ sucursalId: selectedSucursalId.value, q: q.trim() });
});

watch(
  () => [modalItem.costoCompraUnitario, modalItem.factor],
  () => {
    if (!productModalOpen.value || isSyncingModalValues.value) return;
    syncPrecioFromMargen();
  },
);

function lineSubtotalBruto(item: CartItem) {
  return Number((item.cantidadCompra * item.costoCompraUnitario).toFixed(2));
}

function lineDiscountApplied(item: CartItem) {
  return Number(Math.min(lineSubtotalBruto(item), Number(item.descuentoMonto || 0)).toFixed(2));
}

function lineSubtotalNeto(item: CartItem) {
  return Number((lineSubtotalBruto(item) - lineDiscountApplied(item)).toFixed(2));
}

function normalizeCartDiscount(index: number) {
  const item = cart.value[index];
  if (!item) return;
  const max = lineSubtotalBruto(item);
  item.descuentoMonto = Number(Math.min(max, Math.max(0, Number(item.descuentoMonto || 0))).toFixed(2));
}

function calculateMargin(costo: number, precio: number) {
  if (costo <= 0) return 0;
  return Number((((precio / costo) - 1) * 100).toFixed(2));
}

function setPreviousPrices(costo: number, precio: number, margen?: number) {
  previousPrices.costo = Number(costo || 0);
  previousPrices.precio = Number(precio || 0);
  previousPrices.margen = Number(margen ?? calculateMargin(previousPrices.costo, previousPrices.precio));
}

function getCatalogProductId(product: CompraCatalogoProducto) {
  return product.productoId || product.id || '';
}

function resetModalItemBase() {
  modalItem.cantidadCompra = 1;
  modalItem.factor = 1;
  modalItem.costoCompraUnitario = 0;
  modalItem.unidadCompra = unidadStore.unidades[0]?.abreviatura || 'pieza';
  modalItem.lote = '';
  modalItem.fechaVencimiento = '';
  modalItem.margen = 20;
  modalItem.precioVenta = 0;
}

function openProductSearchModal() {
  if (!selectedSucursalId.value) return;
  productSearchTerm.value = '';
  productSearchModalOpen.value = true;
  compraStore.fetchCatalogo({ sucursalId: selectedSucursalId.value, q: '' });
}

function openProductModal(product: CompraCatalogoProducto) {
  const productoId = getCatalogProductId(product);
  editingCartIndex.value = null;
  modalItem.productoId = productoId;
  modalItem.productoNuevo = undefined;
  modalItem.codigoProducto = product.codigo;
  modalItem.nombreProducto = product.nombre;
  // R4: la clasificacion viene del servidor. Si no la expone el catalogo
  // vigente, se marca como desconocida y la UI NO exige lote/fecha por su
  // cuenta: el backend sigue siendo la autoridad y respondera 400 si corresponde.

  resetModalItemBase();
  modalItem.costoCompraUnitario = Number(product.precioCompra || 0);
  setPreviousPrices(Number(product.precioCompra || 0), Number(product.precioVenta || 0));
  syncPrecioFromMargen();
  productModalOpen.value = true;
}

function selectProductFromSearch(product: CompraCatalogoProducto) {
  productSearchModalOpen.value = false;
  openProductModal(product);
}

function editCartItem(index: number) {
  const item = cart.value[index];
  if (!item) return;

  editingCartIndex.value = index;
  modalItem.productoId = item.productoId;
  modalItem.productoNuevo = item.productoNuevo;
  modalItem.codigoProducto = item.codigoProducto;
  modalItem.nombreProducto = item.nombreProducto;
  modalItem.cantidadCompra = item.cantidadCompra;
  modalItem.unidadCompra = item.unidadCompra;
  modalItem.factor = item.factor;
  modalItem.costoCompraUnitario = item.costoCompraUnitario;
  modalItem.lote = item.lote;
  modalItem.fechaVencimiento = item.fechaVencimiento;
  modalItem.margen = item.margen;
  modalItem.precioVenta = item.precioVenta;

  setPreviousPrices(item.costoCompraUnitario, item.precioVenta, item.margen);
  productModalOpen.value = true;
}

function closeProductModal() {
  editingCartIndex.value = null;
  productModalOpen.value = false;
}

function isValidItem() {
  return itemValidationErrors.value.length === 0;
}

function syncPrecioFromMargen() {
  if (costoUnitarioModal.value <= 0) {
    modalItem.precioVenta = 0;
    return;
  }
  isSyncingModalValues.value = true;
  modalItem.precioVenta = Number(
    (costoUnitarioModal.value * (1 + Number(modalItem.margen || 0) / 100)).toFixed(2),
  );
  isSyncingModalValues.value = false;
}

function syncMargenFromPrecio() {
  if (costoUnitarioModal.value <= 0) {
    modalItem.margen = 0;
    return;
  }
  isSyncingModalValues.value = true;
  modalItem.margen = Number(
    (((Number(modalItem.precioVenta || 0) / costoUnitarioModal.value) - 1) * 100).toFixed(2),
  );
  isSyncingModalValues.value = false;
}

function handleMargenInput() {
  if (isSyncingModalValues.value) return;
  syncPrecioFromMargen();
}

function handlePrecioVentaInput() {
  if (isSyncingModalValues.value) return;
  syncMargenFromPrecio();
}

function addItemFromModal() {
  if (!isValidItem()) return;

  const normalizedItem: CartItem = {
    ...modalItem,
    productoNuevo: modalItem.productoNuevo ? { ...modalItem.productoNuevo } : undefined,
    unidadCompra: modalItem.unidadCompra.trim().toLowerCase(),
    costoCompraUnitario: Number(modalItem.costoCompraUnitario),
    descuentoMonto:
      editingCartIndex.value !== null
        ? cart.value[editingCartIndex.value]?.descuentoMonto || 0
        : 0,
    margen: Number(modalItem.margen),
    precioVenta: Number(modalItem.precioVenta),
    lote: modalItem.lote.trim(),
  };

  if (editingCartIndex.value !== null) {
    cart.value.splice(editingCartIndex.value, 1, normalizedItem);
  } else {
    cart.value.push(normalizedItem);
  }

  closeProductModal();
}

async function addQuickProductToCart() {
  // R1.3 / R4.5: los campos esenciales del quick-create son obligatorios;
  // sin ellos no se habilita el alta.
  if (
    !quickProductForm.nombre ||
    !quickProductForm.principioActivo ||
    !quickProductForm.marcaId ||
    !quickProductForm.categoriaId
  ) {
    return;
  }

  editingCartIndex.value = null;
  modalItem.productoId = undefined;
  modalItem.productoNuevo = {
    nombre: quickProductForm.nombre.trim(),
    principioActivo: quickProductForm.principioActivo.trim(),
    marcaId: quickProductForm.marcaId,
    categoriaId: quickProductForm.categoriaId,
  };
  modalItem.codigoProducto = 'NUEVO';
  modalItem.nombreProducto = quickProductForm.nombre.trim();
  resetModalItemBase();
  setPreviousPrices(0, 0, 0);

  quickProductForm.nombre = '';
  quickProductForm.principioActivo = '';
  quickProductForm.marcaId = '';
  quickProductForm.categoriaId = '';
  quickProductModalOpen.value = false;
  productSearchModalOpen.value = false;
  productModalOpen.value = true;
}

const quickProductoCompleto = computed(
  () =>
    !!quickProductForm.nombre.trim() &&
    !!quickProductForm.principioActivo.trim() &&
    !!quickProductForm.marcaId &&
    !!quickProductForm.categoriaId,
);

async function createProveedorQuick() {
  if (!quickProveedorForm.nombre.trim()) return;
  const created = await compraStore.createProveedor({
    nombre: quickProveedorForm.nombre,
    nit: quickProveedorForm.nit || undefined,
    telefono: quickProveedorForm.telefono || undefined,
    direccion: quickProveedorForm.direccion || undefined,
  });
  form.proveedorId = created.id;
  quickProveedorForm.nombre = '';
  quickProveedorForm.nit = '';
  quickProveedorForm.telefono = '';
  quickProveedorForm.direccion = '';
  quickProveedorModalOpen.value = false;
}

function applyEfectivoRedondo() {
  const efectivo = Math.floor(total.value);
  pagos.efectivo = efectivo;
  pagos.transferencia = Number((total.value - efectivo).toFixed(2));
}

function removeItem(index: number) {
  cart.value.splice(index, 1);
}

function getMetodoPagoHeader() {
  const methods = [
    pagos.efectivo > 0 ? 'efectivo' : null,
    pagos.transferencia > 0 ? 'transferencia' : null,
  ].filter(Boolean);

  if (methods.length > 1) return 'mixto';
  return (methods[0] || 'efectivo') as 'efectivo' | 'transferencia' | 'mixto';
}

async function submitCompra() {
  if (!canSubmit.value || !selectedSucursalId.value) return;

  const pagosPayload: Array<{
    metodoPago: CompraPagoMetodo;
    monto: number;
    referencia?: string;
  }> = [];

  if (pagos.efectivo > 0) {
    pagosPayload.push({
      metodoPago: 'efectivo',
      monto: Number(pagos.efectivo.toFixed(2)),
    });
  }

  if (pagos.transferencia > 0) {
    pagosPayload.push({
      metodoPago: 'transferencia',
      monto: Number(pagos.transferencia.toFixed(2)),
      referencia: pagos.referenciaTransferencia || undefined,
    });
  }

  await compraStore.createCompra({
    sucursalId: selectedSucursalId.value,
    proveedorId: form.proveedorId,
    metodoPago: getMetodoPagoHeader(),
    tipoComprobante: form.tipoComprobante,
    numeroComprobante: form.numeroComprobante,
    descuentoGlobal: Number(form.descuentoGlobal || 0),
    items: cart.value.map((item) => ({
      productoId: item.productoId,
      productoNuevo: item.productoNuevo,
      cantidadCompra: Number(item.cantidadCompra),
      unidadCompra: item.unidadCompra,
      factor: Number(item.factor),
      costoCompraUnitario: Number(item.costoCompraUnitario),
      lote: item.lote.trim() || undefined,
      fechaVencimiento: item.fechaVencimiento || undefined,
      descuentoMonto: lineDiscountApplied(item),
      margen: Number(item.margen),
      precioVenta: Number(item.precioVenta),
    })),
    pagos: pagosPayload,
  });

  cart.value = [];
  form.descuentoGlobal = 0;
  pagos.efectivo = 0;
  pagos.transferencia = 0;
  pagos.referenciaTransferencia = '';
}

function money(value: number) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(value || 0);
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Nueva compra</h1>
      <p class="text-sm text-[var(--color-text-secondary)]">
        Ingresa compras por proveedor y actualiza stock por sucursal.
      </p>
    </div>

    <div class="space-y-6">
      <section class="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="text-sm text-[var(--color-text-secondary)]">
            Proveedor
            <div class="mt-1 flex gap-2">
              <select
                v-model="form.proveedorId"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
              >
                <option value="">Seleccionar</option>
                <option
                  v-for="provider in compraStore.proveedores"
                  :key="provider.id"
                  :value="provider.id"
                >
                  {{ provider.nombre }}
                </option>
              </select>
              <button
                class="rounded-lg border border-[var(--color-border)] px-2"
                @click="quickProveedorModalOpen = true"
              >
                +
              </button>
            </div>
          </label>

          <label class="text-sm text-[var(--color-text-secondary)]">
            Tipo comprobante
            <select
              v-model="form.tipoComprobante"
              class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
            >
              <option value="factura">Factura</option>
              <option value="nota_venta">Nota de venta</option>
              <option value="recibo">Recibo</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label class="text-sm text-[var(--color-text-secondary)] md:col-span-2">
            Numero comprobante
            <input
              v-model="form.numeroComprobante"
              type="text"
              class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
            />
          </label>
        </div>

        <button
          class="w-full rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
          @click="openProductSearchModal"
        >
          Buscar producto
        </button>
      </section>

      <section class="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 class="text-sm font-semibold">Carrito de compra</h2>
        <div
          v-if="cart.length === 0"
          class="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]"
        >
          No hay items agregados.
        </div>
        <div v-else class="max-h-72 space-y-2 overflow-auto">
          <article
            v-for="(item, index) in cart"
            :key="`${item.productoId || item.nombreProducto}-${index}`"
            class="rounded-lg border border-[var(--color-border)] p-3"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">
                {{ item.nombreProducto }}

              </p>
              <div class="flex gap-2">
                <button class="text-xs text-[var(--color-primary)]" @click="editCartItem(index)">Editar</button>
                <button class="text-xs text-[var(--color-error)]" @click="removeItem(index)">Quitar</button>
              </div>
            </div>
            <p class="text-xs text-[var(--color-text-secondary)]">
              {{ item.cantidadCompra }} {{ item.unidadCompra }} · factor {{ item.factor }} · lote {{ item.lote }}
            </p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="text-xs text-[var(--color-text-secondary)]">
                Descuento Bs
                <input
                  v-model.number="item.descuentoMonto"
                  type="number"
                  min="0"
                  step="0.01"
                  class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
                  @blur="normalizeCartDiscount(index)"
                />
              </label>
              <div class="text-xs">
                <p class="text-[var(--color-text-secondary)]">Subtotal neto</p>
                <p class="font-semibold">{{ money(lineSubtotalNeto(item)) }}</p>
              </div>
            </div>
          </article>
        </div>

        <div class="space-y-2 border-t border-[var(--color-border)] pt-2 text-sm">
          <div class="flex justify-between"><span>Subtotal</span><strong>{{ money(subtotal) }}</strong></div>
          <div class="flex justify-between"><span>Descuento items</span><strong>- {{ money(descuentoItems) }}</strong></div>
          <label class="block text-xs text-[var(--color-text-secondary)]">
            Descuento global
            <input
              v-model.number="form.descuentoGlobal"
              type="number"
              min="0"
              class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
            />
          </label>
          <div class="flex justify-between"><span>Total</span><strong>{{ money(total) }}</strong></div>
        </div>

        <div class="space-y-2 border-t border-[var(--color-border)] pt-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Pagos</h3>
            <button class="text-xs text-[var(--color-primary)]" @click="applyEfectivoRedondo">
              Efectivo redondo + resto transferencia
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="text-xs">Efectivo
              <input
                v-model.number="pagos.efectivo"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
              />
            </label>
            <label class="text-xs">Transferencia
              <input
                v-model.number="pagos.transferencia"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
              />
            </label>
          </div>
          <label class="text-xs">Referencia transferencia
            <input
              v-model="pagos.referenciaTransferencia"
              type="text"
              class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
            />
          </label>
          <div class="flex justify-between text-sm">
            <span>Saldo</span>
            <strong :class="Math.abs(saldoPendiente) <= 0.01 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
              {{ money(saldoPendiente) }}
            </strong>
          </div>
        </div>

        <button
          class="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="!canSubmit || compraStore.submitting"
          @click="submitCompra"
        >
          {{ compraStore.submitting ? 'Registrando compra...' : 'Finalizar compra' }}
        </button>
      </section>
    </div>

    <Modal
      :open="productSearchModalOpen"
      title="Buscar producto"
      size="3xl"
      @close="productSearchModalOpen = false"
    >
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <input
            v-model="productSearchTerm"
            type="text"
            placeholder="Buscar por nombre, codigo o principio activo"
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <button
            class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            @click="quickProductModalOpen = true"
          >
            Nuevo producto
          </button>
        </div>

        <div class="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table class="w-full">
            <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              <tr>
                <th class="px-3 py-2 text-left text-xs uppercase text-[var(--color-text-secondary)]">Producto</th>
                <th class="px-3 py-2 text-right text-xs uppercase text-[var(--color-text-secondary)]">Stock</th>
                <th class="px-3 py-2 text-right text-xs uppercase text-[var(--color-text-secondary)]">Costo ref</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr v-if="compraStore.loading">
                <td colspan="3" class="px-3 py-4">
                  <TableSkeleton :columns="3" :rows="4" />
                </td>
              </tr>
              <tr v-else-if="compraStore.catalogo.length === 0">
                <td colspan="3" class="px-3 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                  No hay productos para mostrar.
                </td>
              </tr>
              <tr
                v-for="producto in compraStore.catalogo"
                :key="producto.productoId || producto.id || producto.codigo"
                class="cursor-pointer hover:bg-[var(--color-bg)]"
                @dblclick="selectProductFromSearch(producto)"
              >
                <td class="px-3 py-2 text-sm">
                  {{ producto.nombre }}
                  <span class="text-xs text-[var(--color-text-secondary)]">({{ producto.codigo }})</span>
                </td>
                <td class="px-3 py-2 text-right text-sm">{{ producto.stockActual }}</td>
                <td class="px-3 py-2 text-right text-sm">{{ money(producto.precioCompra) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-[var(--color-text-secondary)]">
          Doble click en un producto para seleccionarlo y abrir el detalle del item.
        </p>
      </div>
    </Modal>

    <Modal
      :open="productModalOpen"
      :title="editingCartIndex === null ? 'Agregar item de compra' : 'Editar item de compra'"
      size="3xl"
      @close="closeProductModal"
    >
      <form class="space-y-3" @submit.prevent="addItemFromModal">
        <section class="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)]">Informacion de compra</h3>
          <p class="text-sm text-[var(--color-text-primary)]">{{ modalItem.nombreProducto || 'Producto sin seleccionar' }}</p>
          <p class="text-xs text-[var(--color-text-secondary)]">Codigo: {{ modalItem.codigoProducto || '-' }}</p>
          <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p class="text-xs text-[var(--color-text-secondary)]">Costo anterior</p>
              <p class="text-sm font-semibold">{{ money(previousPrices.costo) }}</p>
            </div>
            <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p class="text-xs text-[var(--color-text-secondary)]">Margen anterior</p>
              <p class="text-sm font-semibold">{{ previousPrices.margen.toFixed(2) }}%</p>
            </div>
            <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p class="text-xs text-[var(--color-text-secondary)]">Precio venta anterior</p>
              <p class="text-sm font-semibold">{{ money(previousPrices.precio) }}</p>
            </div>
          </div>
        </section>

        <section class="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)]">Datos operativos</h3>
          <p class="text-xs text-[var(--color-text-secondary)]">
            Lote y vencimiento son opcionales según el producto.
          </p>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Cantidad compra <span class="text-red-500">*</span></label>
              <input
                v-model.number="modalItem.cantidadCompra"
                type="number"
                min="1"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Unidad compra <span class="text-red-500">*</span></label>
              <select
                v-model="modalItem.unidadCompra"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
              >
                <option
                  v-for="unidad in unidadStore.unidades"
                  :key="unidad.id"
                  :value="unidad.abreviatura"
                >
                  {{ unidad.nombre }} ({{ unidad.abreviatura }})
                </option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Factor <span class="text-red-500">*</span></label>
              <input
                v-model.number="modalItem.factor"
                type="number"
                min="1"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">
                Lote
                <span class="text-[var(--color-text-secondary)]">(opcional)</span>
              </label>
              <input
                v-model="modalItem.lote"
                type="text"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
              />
            </div>
            <div class="space-y-1.5 md:col-span-2 lg:col-span-1">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">
                Vencimiento
                <span class="text-[var(--color-text-secondary)]">(opcional)</span>
              </label>
              <input
                v-model="modalItem.fechaVencimiento"
                type="date"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
              />
            </div>
          </div>

          <!-- R4.3: el vencimiento pasado informa y nunca bloquea la compra -->
          <p
            v-if="fechaVencimientoPasada"
            class="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
          >
            La fecha de vencimiento ya paso. Se registrara igual y el sistema informara
            el lote vencido; no bloquea la compra.
          </p>
        </section>

        <section class="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <h3 class="text-sm font-semibold text-[var(--color-text-primary)]">Precios nuevos</h3>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Costo compra (paquete) <span class="text-red-500">*</span></label>
              <input
                v-model.number="modalItem.costoCompraUnitario"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Costo por unidad</label>
              <input
                :value="costoUnitarioModal"
                type="number"
                readonly
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--color-text-secondary)]"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Margen % <span class="text-red-500">*</span></label>
              <input
                v-model.number="modalItem.margen"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
                @input="handleMargenInput"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Precio venta por unidad <span class="text-red-500">*</span></label>
              <input
                v-model.number="modalItem.precioVenta"
                type="number"
                min="0.01"
                step="0.01"
                class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
                @input="handlePrecioVentaInput"
              />
            </div>
          </div>
        </section>

        <section
          v-if="itemValidationErrors.length > 0"
          class="rounded-lg border border-[var(--color-error)] bg-[var(--color-bg)] p-3"
        >
          <p class="text-sm font-medium text-[var(--color-error)]">Revisa estos campos para continuar:</p>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--color-error)]">
            <li v-for="error in itemValidationErrors" :key="error">{{ error }}</li>
          </ul>
        </section>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-primary)]"
            @click="closeProductModal"
          >
            Cancelar
          </button>
          <button
            class="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-white disabled:opacity-60"
            :disabled="!isValidItem()"
            @click="addItemFromModal"
          >
            Guardar item
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      :open="quickProductModalOpen"
      title="Crear producto rapido"
      size="lg"
      @close="quickProductModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="addQuickProductToCart">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="quickProductForm.nombre"
            type="text"
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Principio activo <span class="text-red-500">*</span></label>
          <input
            v-model="quickProductForm.principioActivo"
            type="text"
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
          />
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Marca <span class="text-red-500">*</span></label>
            <select
              v-model="quickProductForm.marcaId"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
            >
              <option value="">Seleccionar marca</option>
              <option v-for="marca in marcaStore.marcas" :key="marca.id" :value="marca.id">{{ marca.nombre }}</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Categoria <span class="text-red-500">*</span></label>
            <select
              v-model="quickProductForm.categoriaId"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
            >
              <option value="">Seleccionar categoria</option>
              <option
                v-for="categoria in categoriaStore.categorias"
                :key="categoria.id"
                :value="categoria.id"
              >
                {{ categoria.nombre }}
              </option>
            </select>
          </div>
        </div>

      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-primary)]"
            @click="quickProductModalOpen = false"
          >
            Cancelar
          </button>
          <button
            class="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-white disabled:opacity-60"
            :disabled="!quickProductoCompleto"
            @click="addQuickProductToCart"
          >
            Continuar
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      :open="quickProveedorModalOpen"
      title="Crear proveedor rapido"
      size="lg"
      @close="quickProveedorModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="createProveedorQuick">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="quickProveedorForm.nombre"
            type="text"
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
          />
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">NIT</label>
            <input
              v-model="quickProveedorForm.nit"
              type="text"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
            />
          </div>
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Telefono</label>
            <input
              v-model="quickProveedorForm.telefono"
              type="text"
              class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Direccion</label>
          <input
            v-model="quickProveedorForm.direccion"
            type="text"
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5"
          />
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-primary)]"
            @click="quickProveedorModalOpen = false"
          >
            Cancelar
          </button>
          <button
            class="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-white"
            @click="createProveedorQuick"
          >
            Guardar proveedor
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>
