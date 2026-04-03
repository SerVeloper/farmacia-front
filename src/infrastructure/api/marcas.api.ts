import apiClient from '@/infrastructure/api/client';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@/domain/types/marca';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const marcasApi = {
  async getAll(): Promise<Marca[]> {
    const { data } = await apiClient.get<PaginatedResponse<Marca>>('/marcas');
    return data.data;
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