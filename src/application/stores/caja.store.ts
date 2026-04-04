import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useToastStore } from '@/application/stores/toast.store';
import type {
  Caja,
  CajaSalesSummaryResponse,
  CloseCajaDto,
  OpenCajaDto,
} from '@/domain/types/caja';
import { cajasApi } from '@/infrastructure/api/cajas.api';

const EMPTY_SUMMARY: CajaSalesSummaryResponse = {
  totals: {
    efectivo: 0,
    transferencia: 0,
    mixto: 0,
    general: 0,
  },
  items: [],
};

export const useCajaStore = defineStore('caja', () => {
  const authStore = useAuthStore();
  const toast = useToastStore();

  const currentCajas = ref<Caja[]>([]);
  const salesSummary = ref<CajaSalesSummaryResponse>(EMPTY_SUMMARY);
  const lastClosedCaja = ref<Caja | null>(null);

  const loadingCurrent = ref(false);
  const loadingSummary = ref(false);
  const submittingAction = ref(false);

  const myCurrentCaja = computed(() =>
    currentCajas.value.find((caja) => caja.usuarioAperturaId === authStore.user?.id),
  );

  const hasOpenCaja = computed(
    () => myCurrentCaja.value?.estado === 'abierta',
  );

  const hasPausedCaja = computed(
    () => myCurrentCaja.value?.estado === 'pausada',
  );

  const hasOperativeCaja = computed(
    () => hasOpenCaja.value || hasPausedCaja.value,
  );

  async function refreshDashboard(sucursalId: string) {
    loadingCurrent.value = true;
    loadingSummary.value = true;

    try {
      const [cajas, summary] = await Promise.all([
        cajasApi.getCurrent(sucursalId),
        cajasApi.getSalesSummary(sucursalId),
      ]);
      currentCajas.value = cajas;
      salesSummary.value = summary;

      const currentUserBox = cajas.find(
        (caja) => caja.usuarioAperturaId === authStore.user?.id,
      );

      if (currentUserBox) {
        lastClosedCaja.value = null;
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo cargar el estado de caja';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loadingCurrent.value = false;
      loadingSummary.value = false;
    }
  }

  async function openCaja(dto: OpenCajaDto) {
    submittingAction.value = true;
    try {
      const opened = await cajasApi.open(dto);
      currentCajas.value = [
        opened,
        ...currentCajas.value.filter((caja) => caja.id !== opened.id),
      ];
      lastClosedCaja.value = null;
      toast.success('Caja abierta correctamente');
      await refreshDashboard(dto.sucursalId);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo abrir la caja';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      submittingAction.value = false;
    }
  }

  async function closeCaja(cajaId: string, dto: CloseCajaDto, sucursalId: string) {
    submittingAction.value = true;
    try {
      const closed = await cajasApi.close(cajaId, dto);
      currentCajas.value = currentCajas.value.filter((caja) => caja.id !== cajaId);
      lastClosedCaja.value = closed;
      toast.success('Caja cerrada correctamente');
      await refreshDashboard(sucursalId);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo cerrar la caja';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      submittingAction.value = false;
    }
  }

  async function pauseCaja(cajaId: string, sucursalId: string) {
    submittingAction.value = true;
    try {
      await cajasApi.pause(cajaId);
      toast.info('Caja pausada temporalmente');
      await refreshDashboard(sucursalId);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo pausar la caja';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      submittingAction.value = false;
    }
  }

  async function reopenCaja(cajaId: string, sucursalId: string) {
    submittingAction.value = true;
    try {
      const reopened = await cajasApi.reopen(cajaId);
      currentCajas.value = [
        reopened,
        ...currentCajas.value.filter((caja) => caja.id !== reopened.id),
      ];
      lastClosedCaja.value = null;
      toast.success('Caja reaperturada correctamente');
      await refreshDashboard(sucursalId);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo reaperturar la caja';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      submittingAction.value = false;
    }
  }

  return {
    currentCajas,
    salesSummary,
    loadingCurrent,
    loadingSummary,
    submittingAction,
    myCurrentCaja,
    hasOpenCaja,
    hasPausedCaja,
    hasOperativeCaja,
    lastClosedCaja,
    refreshDashboard,
    openCaja,
    closeCaja,
    pauseCaja,
    reopenCaja,
  };
});
