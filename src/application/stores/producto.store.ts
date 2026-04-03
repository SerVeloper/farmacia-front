import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Producto, CreateProductoDto, UpdateProductoDto, PaginatedResponse } from '@/domain/types/producto';
import { productosApi } from '@/infrastructure/api/productos.api';
import { useToastStore } from '@/application/stores/toast.store';

export const useProductoStore = defineStore('productos', () => {
  const productos = ref<Producto[]>([]);
  const productoActual = ref<Producto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const busqueda = ref('');

  const toast = useToastStore();

  async function fetchProductos(page = 1, limit = 10) {
    loading.value = true;
    error.value = null;
    try {
      const response: PaginatedResponse<Producto> = await productosApi.getAll({ page, limit });
      productos.value = response.data;
      pagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages
      };
    } catch (e: any) {
      const message = e.response?.data?.message || 'Error al cargar productos';
      error.value = message;
      toast.error(message);
    } finally {
      loading.value = false;
    }
  }

  async function buscarProductos(query: string) {
    loading.value = true;
    try {
      productos.value = await productosApi.search(query);
    } catch (e: any) {
      toast.error('Error en la búsqueda');
    } finally {
      loading.value = false;
    }
  }

  async function obtenerProducto(id: string) {
    loading.value = true;
    try {
      productoActual.value = await productosApi.getOne(id);
    } catch (e: any) {
      toast.error('Error al obtener producto');
    } finally {
      loading.value = false;
    }
  }

  async function crearProducto(dto: CreateProductoDto) {
    loading.value = true;
    try {
      const nuevo = await productosApi.create(dto);
      productos.value.unshift(nuevo);
      toast.success('Producto creado exitosamente');
      return nuevo;
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al crear producto');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function actualizarProducto(id: string, dto: UpdateProductoDto) {
    loading.value = true;
    try {
      const actualizado = await productosApi.update(id, dto);
      const index = productos.value.findIndex(p => p.id === id);
      if (index !== -1) productos.value[index] = actualizado;
      toast.success('Producto actualizado exitosamente');
      return actualizado;
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al actualizar producto');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function eliminarProducto(id: string) {
    loading.value = true;
    try {
      await productosApi.delete(id);
      productos.value = productos.value.filter(p => p.id !== id);
      toast.success('Producto eliminado exitosamente');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al eliminar producto');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    productos,
    productoActual,
    loading,
    error,
    pagination,
    busqueda,
    fetchProductos,
    buscarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    eliminarProducto
  };
});