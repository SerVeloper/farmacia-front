<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useCompraStore } from '@/application/stores/compra.store';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

const authStore = useAuthStore();
const compraStore = useCompraStore();
const sucursalActivaId = computed(
  () => authStore.user?.sucursalActivaId || authStore.user?.sucursalId || '',
);

const filters = reactive({
  sucursalId: sucursalActivaId.value,
  proveedorId: '',
  numeroCompra: '',
  desde: '',
  hasta: '',
});

onMounted(async () => {
  await compraStore.fetchProveedores();

  await loadCompras();
});

watch(sucursalActivaId, (nextSucursalId) => {
  filters.sucursalId = nextSucursalId;
});

watch(
  () => [filters.sucursalId, filters.proveedorId, filters.numeroCompra, filters.desde, filters.hasta],
  async () => {
    await loadCompras(1);
  },
);

async function loadCompras(page = compraStore.pagination.page || 1) {
  await compraStore.fetchCompras({
    ...filters,
    proveedorId: filters.proveedorId || undefined,
    numeroCompra: filters.numeroCompra || undefined,
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
    page,
    limit: compraStore.pagination.limit,
  });
}

async function viewDetail(id: string) {
  await compraStore.fetchCompraDetalle(id);
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
      <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Compras</h1>
      <p class="text-sm text-[var(--color-text-secondary)]">Historial de compras por sucursal y proveedor.</p>
    </div>

    <section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-5">
        <label class="text-sm text-[var(--color-text-secondary)]">
          Sucursal
          <input :value="filters.sucursalId || 'Sin sucursal activa'" disabled class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2" />
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Proveedor
          <select v-model="filters.proveedorId" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
            <option value="">Todos</option>
            <option v-for="prov in compraStore.proveedores" :key="prov.id" :value="prov.id">{{ prov.nombre }}</option>
          </select>
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Nro compra
          <input v-model="filters.numeroCompra" type="text" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2" />
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Desde
          <input v-model="filters.desde" type="date" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2" />
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Hasta
          <input v-model="filters.hasta" type="date" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2" />
        </label>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Nro compra</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Sucursal</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Proveedor</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Comprobante</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Total</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Fecha</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="compraStore.loading">
              <td colspan="7" class="px-4 py-6"><TableSkeleton :columns="7" :rows="5" /></td>
            </tr>
            <tr v-else-if="compraStore.compras.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">No hay compras para los filtros actuales.</td>
            </tr>
            <tr v-for="compra in compraStore.compras" :key="compra.id" class="hover:bg-[var(--color-bg)]">
              <td class="px-4 py-3 text-sm font-semibold">{{ compra.numeroCompra }}</td>
              <td class="px-4 py-3 text-sm">{{ compra.sucursalNombre }}</td>
              <td class="px-4 py-3 text-sm">{{ compra.proveedorNombre }}</td>
              <td class="px-4 py-3 text-sm">{{ compra.tipoComprobante }} {{ compra.numeroComprobante }}</td>
              <td class="px-4 py-3 text-right text-sm font-semibold">{{ money(compra.total) }}</td>
              <td class="px-4 py-3 text-sm">{{ new Date(compra.fechaCreacion).toLocaleString('es-BO') }}</td>
              <td class="px-4 py-3 text-right"><button class="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs" @click="viewDetail(compra.id)">Detalle</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm">
        <p class="text-[var(--color-text-secondary)]">Mostrando {{ compraStore.compras.length }} de {{ compraStore.pagination.total }} compras</p>
        <div class="flex gap-2">
          <button class="rounded-md border border-[var(--color-border)] px-3 py-1" :disabled="compraStore.pagination.page <= 1" @click="loadCompras(compraStore.pagination.page - 1)">Anterior</button>
          <button class="rounded-md border border-[var(--color-border)] px-3 py-1" :disabled="compraStore.pagination.page >= compraStore.pagination.totalPages" @click="loadCompras(compraStore.pagination.page + 1)">Siguiente</button>
        </div>
      </div>
    </section>

    <section v-if="compraStore.compraDetalle" class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Detalle {{ compraStore.compraDetalle.numeroCompra }}</h2>
        <button class="text-xs text-[var(--color-text-secondary)]" @click="compraStore.clearDetalle()">Cerrar</button>
      </div>
      <div class="grid gap-2 md:grid-cols-3 text-sm">
        <p>Subtotal: <strong>{{ money(compraStore.compraDetalle.subtotal) }}</strong></p>
        <p>Descuento: <strong>{{ money(compraStore.compraDetalle.descuentoTotal) }}</strong></p>
        <p>Total: <strong>{{ money(compraStore.compraDetalle.total) }}</strong></p>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Items</h3>
        <div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table class="w-full min-w-[720px]">
            <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Producto</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Cant</th>
                <th class="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Lote</th>
                <th class="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Vence</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Costo</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Desc.</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr v-for="item in compraStore.compraDetalle.items" :key="item.id">
                <td class="px-3 py-2 text-sm">
                  {{ item.nombreProducto }}
                  <span class="ml-1 text-xs text-[var(--color-text-secondary)]">({{ item.codigoProducto }})</span>
                </td>
                <td class="px-3 py-2 text-right text-sm">{{ item.cantidadCompra }} x {{ item.factor }}</td>
                <td class="px-3 py-2 text-sm">{{ item.lote || '-' }}</td>
                <td class="px-3 py-2 text-sm">{{ item.fechaVencimiento ? new Date(item.fechaVencimiento).toLocaleDateString('es-BO') : '-' }}</td>
                <td class="px-3 py-2 text-right text-sm">{{ money(item.costoCompraUnitario) }}</td>
                <td class="px-3 py-2 text-right text-sm">{{ money(item.descuentoMonto) }}</td>
                <td class="px-3 py-2 text-right text-sm font-semibold">{{ money(item.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Pagos</h3>
        <div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table class="w-full min-w-[420px]">
            <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Metodo</th>
                <th class="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Referencia</th>
                <th class="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr v-for="pago in compraStore.compraDetalle.pagos" :key="pago.id">
                <td class="px-3 py-2 text-sm capitalize">{{ pago.metodoPago }}</td>
                <td class="px-3 py-2 text-sm">{{ pago.referencia || '-' }}</td>
                <td class="px-3 py-2 text-right text-sm font-semibold">{{ money(pago.monto) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
