import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Servicio, CreateServicioDto, UpdateServicioDto } from '@/domain/types/servicio';
import { serviciosApi } from '@/infrastructure/api/servicios.api';
import { useToastStore } from '@/application/stores/toast.store';

export const useServicioStore = defineStore('servicios', () => {
  const servicios = ref<Servicio[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  // Mismo shape que categoria.store: alimenta el resumen "Mostrando X de Y"
  // y los botones Anterior/Siguiente de ServiciosPage.
  const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const toast = useToastStore();

  /**
   * SIN argumentos ⇒ lista completa (la API responde `Servicio[]` sin
   * `pagina`/`limite` en el request): así lo llamarán los <select> del POS.
   * CON `page`/`limit` ⇒ envelope paginado; solo en ese caso se actualiza
   * `pagination`, para no pisar el estado de la página admin cuando un
   * select refetcha el listado completo.
   * El error queda en `error` + toast (patrón categoria.store) y NO se
   * relanza: el listado no tiene caller que deba contener la promesa.
   */
  async function fetchServicios(page?: number, limit?: number) {
    const paginado = page !== undefined || limit !== undefined;
    loading.value = true;
    error.value = null;
    try {
      const response = await serviciosApi.getAll(paginado ? { page, limit } : undefined);
      // Contrato Opción A: array directo sin `limite`, envelope con `limite`.
      if (Array.isArray(response)) {
        servicios.value = response;
        return;
      }
      servicios.value = response.data;
      if (paginado) {
        pagination.value = {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        };
      }
    } catch (e: any) {
      const message = e.response?.data?.message || 'Error al cargar servicios';
      error.value = message;
      toast.error(message);
    } finally {
      loading.value = false;
    }
  }

  async function crearServicio(dto: CreateServicioDto) {
    try {
      const nuevo = await serviciosApi.create(dto);
      servicios.value.unshift(nuevo);
      toast.success('Servicio creado');
      return nuevo;
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al crear servicio');
      throw e;
    }
  }

  async function actualizarServicio(id: string, dto: UpdateServicioDto) {
    try {
      const actualizado = await serviciosApi.update(id, dto);
      const index = servicios.value.findIndex(s => s.id === id);
      if (index !== -1) servicios.value[index] = actualizado;
      toast.success('Servicio actualizado');
      return actualizado;
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al actualizar servicio');
      throw e;
    }
  }

  /**
   * Baja/alta del servicio (soft-delete: la API no expone DELETE).
   * El mensaje del backend, si viene, tiene prioridad sobre el fallback.
   */
  async function cambiarEstadoServicio(id: string, activo: boolean) {
    try {
      const actualizado = await serviciosApi.update(id, { activo });
      const index = servicios.value.findIndex(s => s.id === id);
      if (index !== -1) servicios.value[index] = actualizado;
      toast.success(activo ? 'Servicio activado' : 'Servicio desactivado');
      return actualizado;
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al cambiar el estado del servicio');
      throw e;
    }
  }

  return {
    servicios,
    loading,
    error,
    pagination,
    fetchServicios,
    crearServicio,
    actualizarServicio,
    cambiarEstadoServicio,
  };
});
