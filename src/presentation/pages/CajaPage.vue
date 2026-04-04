<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useCajaStore } from '@/application/stores/caja.store';
import { useSucursalStore } from '@/application/stores/sucursal.store';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

const authStore = useAuthStore();
const cajaStore = useCajaStore();
const sucursalStore = useSucursalStore();

const isPrivileged = computed(
  () =>
    authStore.normalizedRole === 'administrador' ||
    authStore.normalizedRole === 'regente',
);

const selectedSucursalId = ref(authStore.user?.sucursalId || '');

const openForm = reactive({
  montoApertura: 200,
});

const closeForm = reactive({
  montoCierreReal: 0,
  observacion: '',
});

const showCloseForm = ref(false);

const cajaStatusLabel = computed(() => {
  if (cajaStore.hasOpenCaja) return 'Caja Abierta';
  if (cajaStore.hasPausedCaja) return 'Caja Pausada';
  return 'Caja Cerrada';
});

const cajaStatusClass = computed(() => {
  if (cajaStore.hasOpenCaja) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }

  if (cajaStore.hasPausedCaja) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  }

  return 'bg-slate-100 text-slate-700 border-slate-300';
});

const currentCaja = computed(() => cajaStore.myCurrentCaja);
const canReopenClosedCaja = computed(
  () => cajaStore.lastClosedCaja?.estado === 'cerrada',
);

const sucursalName = computed(() => {
  const sucursal = sucursalStore.sucursales.find(
    (item) => item.id === selectedSucursalId.value,
  );
  return sucursal?.nombre || 'Sin sucursal';
});

onMounted(async () => {
  if (isPrivileged.value) {
    await sucursalStore.fetchSucursales();

    if (!selectedSucursalId.value && sucursalStore.sucursales.length > 0) {
      selectedSucursalId.value = sucursalStore.sucursales[0].id;
    }
  }

  if (selectedSucursalId.value) {
    await cajaStore.refreshDashboard(selectedSucursalId.value);
  }
});

watch(selectedSucursalId, async (sucursalId) => {
  if (!sucursalId) return;
  await cajaStore.refreshDashboard(sucursalId);
});

async function handleOpenCaja() {
  if (!selectedSucursalId.value) return;

  await cajaStore.openCaja({
    sucursalId: selectedSucursalId.value,
    montoApertura: Number(openForm.montoApertura),
  });
}

async function handleCloseCaja() {
  if (!selectedSucursalId.value || !currentCaja.value) return;

  await cajaStore.closeCaja(
    currentCaja.value.id,
    {
      montoCierreReal: Number(closeForm.montoCierreReal),
      observacion: closeForm.observacion || undefined,
    },
    selectedSucursalId.value,
  );

  showCloseForm.value = false;
  closeForm.observacion = '';
}

async function handlePauseCaja() {
  if (!selectedSucursalId.value || !currentCaja.value) return;

  await cajaStore.pauseCaja(currentCaja.value.id, selectedSucursalId.value);
}

async function handleReopenCaja() {
  if (!selectedSucursalId.value) return;

  const targetCajaId = currentCaja.value?.id || cajaStore.lastClosedCaja?.id;

  if (!targetCajaId) return;

  await cajaStore.reopenCaja(targetCajaId, selectedSucursalId.value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(value || 0);
}

function formatDate(dateLike: string | null) {
  if (!dateLike) return '-';
  return new Date(dateLike).toLocaleString('es-BO');
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Caja</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">
          Control operativo de apertura, cierre y resumen de ventas del turno.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold"
          :class="cajaStatusClass"
        >
          <span
            class="mr-2 h-2.5 w-2.5 rounded-full"
            :class="
              cajaStore.hasOpenCaja
                ? 'bg-emerald-500 animate-pulse'
                : cajaStore.hasPausedCaja
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
            "
          />
          {{ cajaStatusLabel }}
        </span>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Sucursal</p>
        <p class="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{{ sucursalName }}</p>
      </article>

      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Total del turno</p>
        <p class="mt-2 text-lg font-bold text-[var(--color-text-primary)]">{{ formatMoney(cajaStore.salesSummary.totals.general) }}</p>
      </article>

      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Mi caja</p>
        <p class="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{{ currentCaja?.numeroCaja || 'Sin caja abierta' }}</p>
      </article>
    </div>

    <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <label class="text-sm font-medium text-[var(--color-text-primary)]">Sucursal activa</label>
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
            {{ sucursalName }}
          </p>
        </div>

         <div v-if="!cajaStore.hasOperativeCaja && !canReopenClosedCaja" class="flex items-end gap-2">
          <label class="text-sm font-medium text-[var(--color-text-primary)]">
            Monto de apertura
            <input
              v-model.number="openForm.montoApertura"
              type="number"
              min="1"
              step="0.01"
              class="mt-2 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </label>
          <button
            class="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            :disabled="!selectedSucursalId || cajaStore.submittingAction"
            @click="handleOpenCaja"
          >
            Abrir caja
          </button>
        </div>

        <div v-else class="flex gap-2">
          <button
            v-if="cajaStore.hasPausedCaja || canReopenClosedCaja"
            class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            :disabled="cajaStore.submittingAction"
            @click="handleReopenCaja"
          >
            Reaperturar caja
          </button>

          <button
            v-if="cajaStore.hasOpenCaja"
            class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
            :disabled="cajaStore.submittingAction"
            @click="handlePauseCaja"
          >
            Pausar caja
          </button>

          <button
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
            @click="showCloseForm = !showCloseForm"
          >
            {{ showCloseForm ? 'Cancelar cierre' : 'Cerrar caja' }}
          </button>
        </div>
      </div>

      <div v-if="showCloseForm && currentCaja" class="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 md:grid-cols-3">
        <label class="text-sm font-medium text-amber-900">
          Monto contado
          <input
            v-model.number="closeForm.montoCierreReal"
            type="number"
            min="0"
            step="0.01"
            class="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label class="text-sm font-medium text-amber-900 md:col-span-2">
          Observacion (obligatoria si hay diferencia)
          <input
            v-model="closeForm.observacion"
            type="text"
            class="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div class="md:col-span-3 flex justify-end">
          <button
            class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            :disabled="cajaStore.submittingAction"
            @click="handleCloseCaja"
          >
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Efectivo</p>
        <p class="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{{ formatMoney(cajaStore.salesSummary.totals.efectivo) }}</p>
      </article>
      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Transferencia</p>
        <p class="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{{ formatMoney(cajaStore.salesSummary.totals.transferencia) }}</p>
      </article>
      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Mixto</p>
        <p class="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{{ formatMoney(cajaStore.salesSummary.totals.mixto) }}</p>
      </article>
      <article class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Total</p>
        <p class="mt-2 text-lg font-bold text-[var(--color-primary)]">{{ formatMoney(cajaStore.salesSummary.totals.general) }}</p>
      </article>
    </div>

    <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div class="border-b border-[var(--color-border)] px-4 py-3">
        <h2 class="text-sm font-semibold text-[var(--color-text-primary)]">Resumen de ventas del turno (abierta o pausada)</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Caja</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Fecha y hora</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Usuario</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Metodo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Nro venta</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="cajaStore.loadingSummary">
              <td colspan="6" class="px-4 py-6">
                <TableSkeleton :columns="6" :rows="5" />
              </td>
            </tr>
            <tr v-else-if="cajaStore.salesSummary.items.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                Aun no hay ventas registradas para esta caja abierta.
              </td>
            </tr>
            <tr v-for="item in cajaStore.salesSummary.items" :key="item.id" class="hover:bg-[var(--color-bg)]">
              <td class="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{{ item.numeroCaja }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ formatDate(item.fechaHora) }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ item.usuarioNombre }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)] capitalize">{{ item.metodoPago || '-' }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ item.numeroVenta || '-' }}</td>
              <td class="px-4 py-3 text-right text-sm font-semibold text-[var(--color-text-primary)]">{{ formatMoney(item.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
