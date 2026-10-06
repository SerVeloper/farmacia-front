import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useToastStore } from '@/application/stores/toast.store';
import type {
  CompraCatalogoProducto,
  CompraDetalle,
  CompraResumen,
  CreateCompraDto,
  Proveedor,
} from '@/domain/types/compra';
import { comprasApi } from '@/infrastructure/api/compras.api';

export const useCompraStore = defineStore('compras', () => {
  const toast = useToastStore();
  const loading = ref(false);
  const submitting = ref(false);
  const catalogo = ref<CompraCatalogoProducto[]>([]);
  const proveedores = ref<Proveedor[]>([]);
  const compras = ref<CompraResumen[]>([]);
  const compraDetalle = ref<CompraDetalle | null>(null);
  const pagination = ref({ total: 0, page: 1, limit: 15, totalPages: 1 });

  async function fetchCatalogo(params: { sucursalId?: string; q?: string }) {
    loading.value = true;
    try {
      catalogo.value = await comprasApi.getCatalogo(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo cargar el catalogo';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loading.value = false;
    }
  }

  async function fetchProveedores() {
    try {
      proveedores.value = await comprasApi.getProveedores();
    } catch {
      proveedores.value = [];
    }
  }

  async function createProveedor(dto: {
    nombre: string;
    nit?: string;
    telefono?: string;
    direccion?: string;
  }) {
    const created = await comprasApi.createProveedor(dto);
    proveedores.value.push(created);
    proveedores.value.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return created;
  }

  async function createCompra(dto: CreateCompraDto) {
    submitting.value = true;
    try {
      const compra = await comprasApi.create(dto);
      toast.success(`Compra ${compra.numeroCompra} registrada`);
      return compra;
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo registrar la compra';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      submitting.value = false;
    }
  }

  async function fetchCompras(params: Record<string, unknown>) {
    loading.value = true;
    try {
      const response = await comprasApi.getAll(params);
      compras.value = response.data;
      pagination.value = {
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      };
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo cargar compras';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loading.value = false;
    }
  }

  async function fetchCompraDetalle(id: string) {
    loading.value = true;
    try {
      compraDetalle.value = await comprasApi.getOne(id);
      return compraDetalle.value;
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo obtener la compra';
      toast.error(Array.isArray(message) ? message[0] : message);
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clearDetalle() {
    compraDetalle.value = null;
  }

  return {
    loading,
    submitting,
    catalogo,
    proveedores,
    compras,
    compraDetalle,
    pagination,
    fetchCatalogo,
    fetchProveedores,
    createProveedor,
    createCompra,
    fetchCompras,
    fetchCompraDetalle,
    clearDetalle,
  };
});
