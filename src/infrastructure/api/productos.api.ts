import apiClient from '@/infrastructure/api/client';
import type { 
  Producto, 
  CreateProductoDto, 
  UpdateProductoDto,
  PaginatedResponse,
  PaginationParams
} from '@/domain/types/producto';

export const productosApi = {
  async getAll(params?: Partial<PaginationParams>): Promise<PaginatedResponse<Producto>> {
    const { data } = await apiClient.get<PaginatedResponse<Producto>>('/productos', { 
      params: { pagina: params?.page, limite: params?.limit } 
    });
    return data;
  },

  async getOne(id: string): Promise<Producto> {
    const { data } = await apiClient.get<Producto>(`/productos/${id}`);
    return data;
  },

  async search(query: string): Promise<Producto[]> {
    const { data } = await apiClient.get<Producto[]>('/productos/search', { 
      params: { q: query } 
    });
    return data;
  },

  async create(dto: CreateProductoDto): Promise<Producto> {
    const { data } = await apiClient.post<Producto>('/productos', dto);
    return data;
  },

  async update(id: string, dto: UpdateProductoDto): Promise<Producto> {
    const { data } = await apiClient.patch<Producto>(`/productos/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/productos/${id}`);
  }
};