import apiClient from '@/infrastructure/api/client';
import type {
  CreateUnidadMedidaDto,
  UnidadMedida,
  UpdateUnidadMedidaDto,
} from '@/domain/types/unidad-medida';
import type { PaginatedResponse, PaginationParams } from '@/domain/types/pagination';

export const unidadesMedidaApi = {
  /**
   * Sin `page`/`limit` NO se mandan `pagina`/`limite` ⇒ el backend devuelve el
   * listado COMPLETO (contrato: `limite` ausente = lista completa). Ese modo
   * lo usan los <select> de ProductosPage/ComprasNuevaPage.
   * `includeInactive` se mantiene como filtro independiente de la paginación.
   * Con `page`/`limit` se recibe el envelope paginado completo
   * `{ data, total, page, limit, totalPages }`.
   */
  async getAll(
    params?: { includeInactive?: boolean } & Partial<PaginationParams>,
  ): Promise<PaginatedResponse<UnidadMedida>> {
    const queryParams: Record<string, number | boolean> = {};
    if (params?.includeInactive !== undefined) queryParams.includeInactive = params.includeInactive;
    if (params?.page !== undefined) queryParams.pagina = params.page;
    if (params?.limit !== undefined) queryParams.limite = params.limit;

    const { data } = await apiClient.get<PaginatedResponse<UnidadMedida>>('/unidades-medida', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return data;
  },

  async create(dto: CreateUnidadMedidaDto): Promise<UnidadMedida> {
    const { data } = await apiClient.post<UnidadMedida>('/unidades-medida', dto);
    return data;
  },

  async update(id: string, dto: UpdateUnidadMedidaDto): Promise<UnidadMedida> {
    const { data } = await apiClient.patch<UnidadMedida>(
      `/unidades-medida/${id}`,
      dto,
    );
    return data;
  },
};
