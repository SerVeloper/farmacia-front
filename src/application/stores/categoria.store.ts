import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Categoria, CreateCategoriaDto, UpdateCategoriaDto } from '@/domain/types/categoria';
import { categoriasApi } from '@/infrastructure/api/categorias.api';
import { useToastStore } from '@/application/stores/toast.store';

export const useCategoriaStore = defineStore('categorias', () => {
  const categorias = ref<Categoria[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  // Mismo shape que producto.store: alimenta el resumen "Mostrando X de Y"
  // y los botones Anterior/Siguiente de CategoriasPage.
  const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const toast = useToastStore();

  /**
   * SIN argumentos ⇒ lista completa (sin `pagina`/`limite` en el request):
   * así lo llaman los <select> de ProductosPage y ComprasNuevaPage y esos
   * calls NO deben empezar a paginar.
   * CON `page`/`limit` ⇒ página concreta; solo en ese caso se actualiza
   * `pagination`, para no pisar el estado de la página admin cuando un
   * select refetcha el listado completo.
   * El error queda en `error` + toast (patrón producto.store) y NO se
   * relanza: el listado no tiene caller que deba contener la promesa.
   */
  async function fetchCategorias(page?: number, limit?: number) {
    const paginado = page !== undefined || limit !== undefined;
    loading.value = true;
    error.value = null;
    try {
      const response = await categoriasApi.getAll(paginado ? { page, limit } : undefined);
      categorias.value = response.data;
      if (paginado) {
        pagination.value = {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        };
      }
    } catch (e: any) {
      const message = e.response?.data?.message || 'Error al cargar categorías';
      error.value = message;
      toast.error(message);
    } finally {
      loading.value = false;
    }
  }

  async function crearCategoria(dto: CreateCategoriaDto) {
    try {
      const nueva = await categoriasApi.create(dto);
      categorias.value.unshift(nueva);
      toast.success('Categoría creada');
      return nueva;
    } catch (e) {
      toast.error('Error al crear categoría');
      throw e;
    }
  }

  async function actualizarCategoria(id: string, dto: UpdateCategoriaDto) {
    try {
      const actualizada = await categoriasApi.update(id, dto);
      const index = categorias.value.findIndex(c => c.id === id);
      if (index !== -1) categorias.value[index] = actualizada;
      toast.success('Categoría actualizada');
      return actualizada;
    } catch (e) {
      toast.error('Error al actualizar categoría');
      throw e;
    }
  }

  async function eliminarCategoria(id: string) {
    try {
      await categoriasApi.delete(id);
      categorias.value = categorias.value.filter(c => c.id !== id);
      toast.success('Categoría eliminada');
    } catch (e) {
      toast.error('Error al eliminar categoría');
      throw e;
    }
  }

  return {
    categorias,
    loading,
    error,
    pagination,
    fetchCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
  };
});