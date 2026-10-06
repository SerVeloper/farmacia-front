import apiClient from '@/infrastructure/api/client';
import type { Categoria, CreateCategoriaDto, UpdateCategoriaDto } from '@/domain/types/categoria';
import type { PaginatedResponse, PaginationParams } from '@/domain/types/pagination';

export const categoriasApi = {
  /**
   * Sin argumentos NO se manda `pagina`/`limite` ⇒ el backend devuelve el
   * listado COMPLETO (contrato: `limite` ausente = lista completa). Ese modo
   * lo usan los <select> de ProductosPage/ComprasNuevaPage.
   * Con `page`/`limit` se pide una página concreta y se recibe el envelope
   * paginado completo `{ data, total, page, limit, totalPages }`.
   */
  async getAll(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Categoria>> {
    const queryParams: Record<string, number> = {};
    if (params?.page !== undefined) queryParams.pagina = params.page;
    if (params?.limit !== undefined) queryParams.limite = params.limit;

    const { data } = await apiClient.get<PaginatedResponse<Categoria>>('/categorias', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return data;
  },

  async getOne(id: string): Promise<Categoria> {
    const { data } = await apiClient.get<Categoria>(`/categorias/${id}`);
    return data;
  },

  async create(dto: CreateCategoriaDto): Promise<Categoria> {
    const { data } = await apiClient.post<Categoria>('/categorias', dto);
    return data;
  },

  async update(id: string, dto: UpdateCategoriaDto): Promise<Categoria> {
    const { data } = await apiClient.patch<Categoria>(`/categorias/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/categorias/${id}`);
  }
};