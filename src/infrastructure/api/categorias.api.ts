import apiClient from '@/infrastructure/api/client';
import type { Categoria, CreateCategoriaDto, UpdateCategoriaDto } from '@/domain/types/categoria';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const categoriasApi = {
  async getAll(): Promise<Categoria[]> {
    const { data } = await apiClient.get<PaginatedResponse<Categoria>>('/categorias');
    return data.data;
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