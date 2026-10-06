import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useToastStore } from '@/application/stores/toast.store';
import type {
  CreateUnidadMedidaDto,
  UnidadMedida,
  UpdateUnidadMedidaDto,
} from '@/domain/types/unidad-medida';
import { unidadesMedidaApi } from '@/infrastructure/api/unidades-medida.api';

export const useUnidadMedidaStore = defineStore('unidades-medida', () => {
  const toast = useToastStore();
  const unidades = ref<UnidadMedida[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  // Mismo shape que producto.store: alimenta el resumen "Mostrando X de Y"
  // y los botones Anterior/Siguiente de UnidadesMedidaPage.
  const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 });

  /**
   * SIN `page`/`limit` ⇒ lista completa (sin `pagina`/`limite` en el request):
   * así lo llaman los <select> de ProductosPage y ComprasNuevaPage y esos
   * calls NO deben empezar a paginar. `includeInactive` es un filtro
   * independiente de la paginación y se conserva en ambos modos.
   * CON `page`/`limit` ⇒ página concreta; solo en ese caso se actualiza
   * `pagination`, para no pisar el estado de la página admin cuando un
   * select refetcha el listado completo.
   * El error queda en `error` + toast (patrón producto.store) y NO se relanza.
   */
  async function fetchUnidades(includeInactive = false, page?: number, limit?: number) {
    const paginado = page !== undefined || limit !== undefined;
    loading.value = true;
    error.value = null;
    try {
      const response = await unidadesMedidaApi.getAll(
        paginado ? { includeInactive, page, limit } : { includeInactive },
      );
      unidades.value = response.data;
      if (paginado) {
        pagination.value = {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        };
      }
    } catch (e: any) {
      const message = e.response?.data?.message || 'No se pudieron cargar las unidades de medida';
      error.value = message;
      toast.error(message);
    } finally {
      loading.value = false;
    }
  }

  async function createUnidad(dto: CreateUnidadMedidaDto) {
    try {
      const created = await unidadesMedidaApi.create(dto);
      unidades.value.unshift(created);
      toast.success('Unidad de medida creada');
      return created;
    } catch (e: any) {
      // toast + relanzado (patrón producto.store): la página contiene la
      // promesa en su catch SIN duplicar el toast.
      toast.error(e.response?.data?.message || 'Error al crear unidad de medida');
      throw e;
    }
  }

  async function updateUnidad(id: string, dto: UpdateUnidadMedidaDto) {
    try {
      const updated = await unidadesMedidaApi.update(id, dto);
      const index = unidades.value.findIndex((unidad) => unidad.id === id);
      if (index >= 0) {
        unidades.value[index] = updated;
      }
      toast.success('Unidad de medida actualizada');
      return updated;
    } catch (e: any) {
      // toast + relanzado (patrón producto.store): la página contiene la
      // promesa en su catch SIN duplicar el toast.
      toast.error(e.response?.data?.message || 'Error al actualizar unidad de medida');
      throw e;
    }
  }

  return {
    unidades,
    loading,
    error,
    pagination,
    fetchUnidades,
    createUnidad,
    updateUnidad,
  };
});
