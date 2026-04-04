<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useSucursalStore } from '@/application/stores/sucursal.store';
import { useVentaStore } from '@/application/stores/venta.store';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

const authStore = useAuthStore();
const sucursalStore = useSucursalStore();
const ventaStore = useVentaStore();

const isPrivileged = computed(
  () =>
    authStore.normalizedRole === 'administrador' ||
    authStore.normalizedRole === 'regente',
);

const filters = reactive({
  sucursalId: authStore.user?.sucursalId || '',
  numeroVenta: '',
  desde: '',
  hasta: '',
});

onMounted(async () => {
  if (isPrivileged.value) {
    await sucursalStore.fetchSucursales();

    if (!filters.sucursalId && sucursalStore.sucursales.length > 0) {
      filters.sucursalId = sucursalStore.sucursales[0].id;
    }
  }

  await loadVentas();
});

watch(
  () => [filters.sucursalId, filters.numeroVenta, filters.desde, filters.hasta],
  async () => {
    await loadVentas(1);
  },
);

async function loadVentas(page = ventaStore.pagination.page || 1) {
  await ventaStore.fetchVentas({
    sucursalId: filters.sucursalId || undefined,
    numeroVenta: filters.numeroVenta || undefined,
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
    page,
    limit: ventaStore.pagination.limit,
  });
}

async function viewDetail(id: string) {
  await ventaStore.fetchVentaDetalle(id);
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
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Ventas</h1>
      <p class="text-sm text-[var(--color-text-secondary)]">Historial de ventas por sucursal y vendedor.</p>
    </div>

    <section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-4">
        <label v-if="isPrivileged" class="text-sm text-[var(--color-text-secondary)]">
          Sucursal
          <select v-model="filters.sucursalId" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm">
            <option value="">Todas</option>
            <option v-for="sucursal in sucursalStore.sucursales" :key="sucursal.id" :value="sucursal.id">
              {{ sucursal.nombre }}
            </option>
          </select>
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Nro venta
          <input v-model="filters.numeroVenta" type="text" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Desde
          <input v-model="filters.desde" type="date" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
        </label>

        <label class="text-sm text-[var(--color-text-secondary)]">
          Hasta
          <input v-model="filters.hasta" type="date" class="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
        </label>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Nro venta</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Sucursal</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Vendedor</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Descuento</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Total</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Fecha</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="ventaStore.loading">
              <td colspan="7" class="px-4 py-6">
                <TableSkeleton :columns="7" :rows="5" />
              </td>
            </tr>
            <tr v-else-if="ventaStore.ventas.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                No hay ventas para los filtros actuales.
              </td>
            </tr>
            <tr v-for="venta in ventaStore.ventas" :key="venta.id" class="hover:bg-[var(--color-bg)]">
              <td class="px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)]">{{ venta.numeroVenta }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ venta.sucursalNombre }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ venta.vendedorNombre }}</td>
              <td class="px-4 py-3 text-right text-sm text-[var(--color-text-secondary)]">{{ money(venta.descuentoTotal) }}</td>
              <td class="px-4 py-3 text-right text-sm font-semibold text-[var(--color-text-primary)]">{{ money(venta.total) }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ new Date(venta.fechaCreacion).toLocaleString('es-BO') }}</td>
              <td class="px-4 py-3 text-right">
                <button class="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs" @click="viewDetail(venta.id)">Detalle</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm">
        <p class="text-[var(--color-text-secondary)]">
          Mostrando {{ ventaStore.ventas.length }} de {{ ventaStore.pagination.total }} ventas
        </p>
        <div class="flex gap-2">
          <button
            class="rounded-md border border-[var(--color-border)] px-3 py-1"
            :disabled="ventaStore.pagination.page <= 1"
            @click="loadVentas(ventaStore.pagination.page - 1)"
          >
            Anterior
          </button>
          <button
            class="rounded-md border border-[var(--color-border)] px-3 py-1"
            :disabled="ventaStore.pagination.page >= ventaStore.pagination.totalPages"
            @click="loadVentas(ventaStore.pagination.page + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>

    <section v-if="ventaStore.ventaDetalle" class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-[var(--color-text-primary)]">Detalle {{ ventaStore.ventaDetalle.numeroVenta }}</h2>
        <button class="text-xs text-[var(--color-text-secondary)]" @click="ventaStore.clearVentaDetalle()">Cerrar</button>
      </div>
      <div class="grid gap-2 md:grid-cols-3 text-sm">
        <p><span class="text-[var(--color-text-secondary)]">Subtotal:</span> {{ money(ventaStore.ventaDetalle.subtotal) }}</p>
        <p><span class="text-[var(--color-text-secondary)]">Descuento:</span> {{ money(ventaStore.ventaDetalle.descuentoTotal) }}</p>
        <p><span class="text-[var(--color-text-secondary)]">Total:</span> <strong>{{ money(ventaStore.ventaDetalle.total) }}</strong></p>
      </div>
      <div class="text-sm">
        <p class="mb-1 text-[var(--color-text-secondary)]">Pagos</p>
        <ul class="space-y-1">
          <li v-for="pago in ventaStore.ventaDetalle.pagos" :key="pago.id" class="flex items-center justify-between">
            <span class="capitalize">{{ pago.metodoPago }} {{ pago.referencia ? `(${pago.referencia})` : '' }}</span>
            <strong>{{ money(pago.monto) }}</strong>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
