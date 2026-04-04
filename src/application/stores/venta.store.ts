import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useToastStore } from '@/application/stores/toast.store';
import type {
  CreateVentaDto,
  VentaCatalogoProducto,
  VentaDetalle,
  VentasQuery,
  VentaResumen,
} from '@/domain/types/venta';
import { ventasApi } from '@/infrastructure/api/ventas.api';

export const useVentaStore = defineStore('ventas', () => {
  const toast = useToastStore();

  const loading = ref(false);
  const submitting = ref(false);
  const catalogo = ref<VentaCatalogoProducto[]>([]);
  const ventas = ref<VentaResumen[]>([]);
  const ventaDetalle = ref<VentaDetalle | null>(null);

  const pagination = ref({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  async function fetchCatalogo(params: { sucursalId?: string; q?: string }) {
    loading.value = true;
    try {
      catalogo.value = await ventasApi.getCatalogo(params);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo cargar el catalogo de ventas';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loading.value = false;
    }
  }

  async function createVenta(dto: CreateVentaDto) {
    submitting.value = true;
    try {
      const venta = await ventasApi.create(dto);
      toast.success(`Venta ${venta.numeroVenta} registrada`);
      return venta;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo registrar la venta';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      submitting.value = false;
    }
  }

  async function fetchVentas(query: VentasQuery) {
    loading.value = true;
    try {
      const response = await ventasApi.getAll(query);
      ventas.value = response.data;
      pagination.value = {
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo cargar el historial de ventas';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loading.value = false;
    }
  }

  async function fetchVentaDetalle(id: string) {
    loading.value = true;
    try {
      ventaDetalle.value = await ventasApi.getOne(id);
      return ventaDetalle.value;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'No se pudo obtener la venta';
      toast.error(Array.isArray(message) ? message[0] : message);
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clearVentaDetalle() {
    ventaDetalle.value = null;
  }

  return {
    loading,
    submitting,
    catalogo,
    ventas,
    ventaDetalle,
    pagination,
    fetchCatalogo,
    createVenta,
    fetchVentas,
    fetchVentaDetalle,
    clearVentaDetalle,
  };
});
