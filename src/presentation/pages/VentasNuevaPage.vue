<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useSucursalStore } from '@/application/stores/sucursal.store';
import { useVentaStore } from '@/application/stores/venta.store';
import type {
  CreateVentaDto,
  VentaCatalogoProducto,
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
}

const authStore = useAuthStore();
const sucursalStore = useSucursalStore();
const ventaStore = useVentaStore();

const isPrivileged = computed(
  () => authStore.normalizedRole === 'administrador',
);

const selectedSucursalId = ref(
  authStore.user?.sucursalActivaId || authStore.user?.sucursalId || '',
);
const searchTerm = ref('');
const cart = ref<CartItem[]>([]);
const descuentoGlobal = ref(0);
const transferenciaRef = ref('');

const pagos = reactive<{
  efectivo: number;
  transferencia: number;
}>({
  efectivo: 0,
  transferencia: 0,
});

const subtotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.precioVenta * item.cantidad, 0),
);

const descuentoItems = computed(() =>
  cart.value.reduce((sum, item) => sum + item.descuentoMonto, 0),
);

const total = computed(() => {
  const raw = subtotal.value - descuentoItems.value - Number(descuentoGlobal.value || 0);
  return Number(Math.max(0, raw).toFixed(2));
});

const pagosTotal = computed(
  () => Number(pagos.efectivo || 0) + Number(pagos.transferencia || 0),
);

const saldoPendiente = computed(() => Number((total.value - pagosTotal.value).toFixed(2)));

const canSubmit = computed(
  () =>
    !!selectedSucursalId.value &&
    cart.value.length > 0 &&
    total.value > 0 &&
    Math.abs(saldoPendiente.value) <= 0.01,
);

onMounted(async () => {
  if (isPrivileged.value) {
    await sucursalStore.fetchSucursales();

    if (!selectedSucursalId.value && sucursalStore.sucursales.length > 0) {
      selectedSucursalId.value = sucursalStore.sucursales[0].id;
    }
  }

  if (selectedSucursalId.value) {
    await ventaStore.fetchCatalogo({ sucursalId: selectedSucursalId.value });
  }
});

watch(selectedSucursalId, async (sucursalId) => {
  if (!sucursalId) return;
  cart.value = [];
  resetPagos();
  await ventaStore.fetchCatalogo({ sucursalId });
});

watch(searchTerm, async (q) => {
  if (!selectedSucursalId.value) return;
  await ventaStore.fetchCatalogo({ sucursalId: selectedSucursalId.value, q });
});

function addProduct(product: VentaCatalogoProducto) {
  const existing = cart.value.find((item) => item.productoId === product.productoId);

  if (existing) {
    if (existing.cantidad < existing.stockActual) {
      existing.cantidad += 1;
    }
    return;
  }

  cart.value.push({
    productoId: product.productoId,
    codigo: product.codigo,
    nombre: product.nombre,
    precioVenta: product.precioVenta,
    stockActual: product.stockActual,
    cantidad: 1,
    descuentoMonto: 0,
  });
}

function removeItem(productoId: string) {
  cart.value = cart.value.filter((item) => item.productoId !== productoId);
}

function applyEfectivoRedondo() {
  const efectivo = Math.floor(total.value);
  pagos.efectivo = efectivo;
  pagos.transferencia = Number((total.value - efectivo).toFixed(2));
}

function resetPagos() {
  pagos.efectivo = 0;
  pagos.transferencia = 0;
  transferenciaRef.value = '';
}

async function submitVenta() {
  if (!canSubmit.value || !selectedSucursalId.value) return;

  const payload: CreateVentaDto = {
    sucursalId: selectedSucursalId.value,
    descuentoGlobal: Number(descuentoGlobal.value || 0),
    items: cart.value.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      descuentoMonto: Number(item.descuentoMonto || 0),
    })),
    pagos: buildPagos(),
  };

  await ventaStore.createVenta(payload);
  cart.value = [];
  descuentoGlobal.value = 0;
  resetPagos();
  await ventaStore.fetchCatalogo({ sucursalId: selectedSucursalId.value });
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

  if (pagos.efectivo > 0) {
    result.push({ metodoPago: 'efectivo', monto: Number(pagos.efectivo.toFixed(2)) });
  }

  if (pagos.transferencia > 0) {
    result.push({
      metodoPago: 'transferencia',
      monto: Number(pagos.transferencia.toFixed(2)),
      referencia: transferenciaRef.value || undefined,
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
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Nueva venta</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">Registra una venta con descuentos en Bs y pagos mixtos.</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm space-y-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--color-text-primary)]">Sucursal</label>
            <select
              v-if="isPrivileged"
              v-model="selectedSucursalId"
              class="w-full min-w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              <option v-for="sucursal in sucursalStore.sucursales" :key="sucursal.id" :value="sucursal.id">
                {{ sucursal.nombre }}
              </option>
            </select>
            <p v-else class="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
              {{ sucursalStore.sucursales.find((s) => s.id === selectedSucursalId)?.nombre || 'Sucursal asignada' }}
            </p>
          </div>

          <div class="w-full md:w-80">
            <label class="text-sm font-medium text-[var(--color-text-primary)]">Buscar producto</label>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Nombre, codigo o principio activo"
              class="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table class="w-full">
            <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Producto</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Stock</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Precio</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Accion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr v-if="ventaStore.loading">
                <td colspan="4" class="px-3 py-4">
                  <TableSkeleton :columns="4" :rows="4" />
                </td>
              </tr>
              <tr v-else-if="ventaStore.catalogo.length === 0">
                <td colspan="4" class="px-3 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                  No hay productos con stock disponible.
                </td>
              </tr>
              <tr v-for="item in ventaStore.catalogo" :key="item.inventarioId" class="hover:bg-[var(--color-bg)]">
                <td class="px-3 py-2 text-sm text-[var(--color-text-primary)]">{{ item.nombre }} <span class="text-xs text-[var(--color-text-secondary)]">({{ item.codigo }})</span></td>
                <td class="px-3 py-2 text-right text-sm text-[var(--color-text-secondary)]">{{ item.stockActual }}</td>
                <td class="px-3 py-2 text-right text-sm text-[var(--color-text-primary)]">{{ money(item.precioVenta) }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    class="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                    @click="addProduct(item)"
                  >
                    Agregar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text-primary)]">Carrito</h2>

        <div v-if="cart.length === 0" class="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          Agrega productos para iniciar la venta.
        </div>

        <div v-else class="space-y-3">
          <article v-for="item in cart" :key="item.productoId" class="rounded-lg border border-[var(--color-border)] p-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-[var(--color-text-primary)]">{{ item.nombre }}</p>
                <p class="text-xs text-[var(--color-text-secondary)]">{{ item.codigo }} · Stock {{ item.stockActual }}</p>
              </div>
              <button class="text-xs text-red-500" @click="removeItem(item.productoId)">Quitar</button>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-2">
              <label class="text-xs text-[var(--color-text-secondary)]">
                Cantidad
                <input v-model.number="item.cantidad" type="number" min="1" :max="item.stockActual" class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" />
              </label>
              <label class="text-xs text-[var(--color-text-secondary)]">
                Precio
                <input :value="item.precioVenta" type="number" disabled class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm opacity-80" />
              </label>
              <label class="text-xs text-[var(--color-text-secondary)]">
                Descuento Bs
                <input v-model.number="item.descuentoMonto" type="number" min="0" :max="item.precioVenta * item.cantidad" step="0.01" class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" />
              </label>
            </div>
          </article>
        </div>

        <div class="space-y-2 border-t border-[var(--color-border)] pt-3 text-sm">
          <div class="flex items-center justify-between"><span>Subtotal</span><strong>{{ money(subtotal) }}</strong></div>
          <div class="flex items-center justify-between"><span>Descuento items</span><strong>- {{ money(descuentoItems) }}</strong></div>
          <label class="block text-xs text-[var(--color-text-secondary)]">
            Descuento global Bs
            <input v-model.number="descuentoGlobal" type="number" min="0" :max="subtotal - descuentoItems" step="0.01" class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" />
          </label>
          <div class="flex items-center justify-between text-base"><span>Total</span><strong>{{ money(total) }}</strong></div>
        </div>

        <div class="space-y-2 border-t border-[var(--color-border)] pt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-[var(--color-text-primary)]">Pagos</h3>
            <button class="text-xs text-[var(--color-primary)]" @click="applyEfectivoRedondo">Efectivo redondo + resto transferencia</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="text-xs text-[var(--color-text-secondary)]">
              Efectivo
              <input v-model.number="pagos.efectivo" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" />
            </label>
            <label class="text-xs text-[var(--color-text-secondary)]">
              Transferencia
              <input v-model.number="pagos.transferencia" type="number" min="0" step="0.01" class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" />
            </label>
          </div>
          <label class="text-xs text-[var(--color-text-secondary)]">
            Referencia transferencia
            <input v-model="transferenciaRef" type="text" class="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm" />
          </label>
          <div class="flex items-center justify-between text-sm">
            <span class="text-[var(--color-text-secondary)]">Saldo pendiente</span>
            <strong :class="Math.abs(saldoPendiente) <= 0.01 ? 'text-emerald-600' : 'text-red-600'">{{ money(saldoPendiente) }}</strong>
          </div>
        </div>

        <button
          class="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canSubmit || ventaStore.submitting"
          @click="submitVenta"
        >
          {{ ventaStore.submitting ? 'Registrando...' : 'Confirmar venta' }}
        </button>
      </section>
    </div>
  </div>
</template>
