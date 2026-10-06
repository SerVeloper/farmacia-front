import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@/domain/types/marca';
import { marcasApi } from '@/infrastructure/api/marcas.api';
import { useToastStore } from '@/application/stores/toast.store';

export const useMarcaStore = defineStore('marcas', () => {
  const marcas = ref<Marca[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  // Mismo shape que producto.store: alimenta el resumen "Mostrando X de Y"
  // y los botones Anterior/Siguiente de MarcasPage.
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
  async function fetchMarcas(page?: number, limit?: number) {
    const paginado = page !== undefined || limit !== undefined;
    loading.value = true;
    error.value = null;
    try {
      const response = await marcasApi.getAll(paginado ? { page, limit } : undefined);
      marcas.value = response.data;
      if (paginado) {
        pagination.value = {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        };
      }
    } catch (e: any) {
      const message = e.response?.data?.message || 'Error al cargar marcas';
      error.value = message;
      toast.error(message);
    } finally {
      loading.value = false;
    }
  }

  async function crearMarca(dto: CreateMarcaDto) {
    try {
      const nueva = await marcasApi.create(dto);
      marcas.value.unshift(nueva);
      toast.success('Marca creada');
      return nueva;
    } catch (e) {
      toast.error('Error al crear marca');
      throw e;
    }
  }

  async function actualizarMarca(id: string, dto: UpdateMarcaDto) {
    try {
      const actualizada = await marcasApi.update(id, dto);
      const index = marcas.value.findIndex(m => m.id === id);
      if (index !== -1) marcas.value[index] = actualizada;
      toast.success('Marca actualizada');
      return actualizada;
    } catch (e) {
      toast.error('Error al actualizar marca');
      throw e;
    }
  }

  async function eliminarMarca(id: string) {
    try {
      await marcasApi.delete(id);
      marcas.value = marcas.value.filter(m => m.id !== id);
      toast.success('Marca eliminada');
    } catch (e) {
      toast.error('Error al eliminar marca');
      throw e;
    }
  }

  return {
    marcas,
    loading,
    error,
    pagination,
    fetchMarcas,
    crearMarca,
    actualizarMarca,
    eliminarMarca,
  };
});