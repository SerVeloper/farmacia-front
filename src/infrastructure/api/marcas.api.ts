import apiClient from '@/infrastructure/api/client';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@/domain/types/marca';
import type { PaginatedResponse, PaginationParams } from '@/domain/types/pagination';

export const marcasApi = {
  /**
   * Sin argumentos NO se manda `pagina`/`limite` ⇒ el backend devuelve el
   * listado COMPLETO (contrato: `limite` ausente = lista completa). Ese modo
   * lo usan los <select> de ProductosPage/ComprasNuevaPage.
   * Con `page`/`limit` se pide una página concreta y se recibe el envelope
   * paginado completo `{ data, total, page, limit, totalPages }`.
   */
  async getAll(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Marca>> {
    const queryParams: Record<string, number> = {};
    if (params?.page !== undefined) queryParams.pagina = params.page;
    if (params?.limit !== undefined) queryParams.limite = params.limit;

    const { data } = await apiClient.get<PaginatedResponse<Marca>>('/marcas', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return data;
  },

  async getOne(id: string): Promise<Marca> {
    const { data } = await apiClient.get<Marca>(`/marcas/${id}`);
    return data;
  },

  async create(dto: CreateMarcaDto): Promise<Marca> {
    const { data } = await apiClient.post<Marca>('/marcas', dto);
    return data;
  },

  async update(id: string, dto: UpdateMarcaDto): Promise<Marca> {
    const { data } = await apiClient.patch<Marca>(`/marcas/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/marcas/${id}`);
  }
};