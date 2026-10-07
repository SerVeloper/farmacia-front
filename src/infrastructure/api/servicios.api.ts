import apiClient from '@/infrastructure/api/client';
import type { Servicio, CreateServicioDto, UpdateServicioDto } from '@/domain/types/servicio';
import type { PaginatedResponse, PaginationParams } from '@/domain/types/pagination';

export const serviciosApi = {
  /**
   * Contrato de paginación Opción A (mismo envelope que categorías/marcas):
   * - Sin `limite` ⇒ el backend devuelve el listado COMPLETO como array
   *   (`Servicio[]`). Así lo consumirán los <select> del POS.
   * - Con `limite` ⇒ envelope paginado `{ data, total, page, limit, totalPages }`.
   *
   * Por eso los params SOLO se mandan cuando el caller los provee: un
   * `getAll()` sin argumentos debe seguir devolviendo la lista completa.
   * El caller (store) distingue ambos shapes con `Array.isArray`.
   */
  async getAll(params?: Partial<PaginationParams>): Promise<Servicio[] | PaginatedResponse<Servicio>> {
    const queryParams: Record<string, number> = {};
    if (params?.page !== undefined) queryParams.pagina = params.page;
    if (params?.limit !== undefined) queryParams.limite = params.limit;

    const { data } = await apiClient.get<Servicio[] | PaginatedResponse<Servicio>>('/servicios', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return data;
  },

  async getOne(id: string): Promise<Servicio> {
    const { data } = await apiClient.get<Servicio>(`/servicios/${id}`);
    return data;
  },

  async create(dto: CreateServicioDto): Promise<Servicio> {
    const { data } = await apiClient.post<Servicio>('/servicios', dto);
    return data;
  },

  // Sin `delete()`: la API no expone DELETE. La baja es soft-delete
  // vía PATCH { activo: false } (ver cambiarEstadoServicio en el store).
  async update(id: string, dto: UpdateServicioDto): Promise<Servicio> {
    const { data } = await apiClient.patch<Servicio>(`/servicios/${id}`, dto);
    return data;
  },
};
