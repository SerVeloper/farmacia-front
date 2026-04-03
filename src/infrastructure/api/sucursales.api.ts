import apiClient from '@/infrastructure/api/client';
import type {
  CreateSucursalDto,
  Sucursal,
  UpdateSucursalDto,
} from '@/domain/types/sucursal';

export const sucursalesApi = {
  async getAll(): Promise<Sucursal[]> {
    const { data } = await apiClient.get<Sucursal[]>('/sucursales');
    return data;
  },

  async create(dto: CreateSucursalDto): Promise<Sucursal> {
    const { data } = await apiClient.post<Sucursal>('/sucursales', dto);
    return data;
  },

  async update(id: string, dto: UpdateSucursalDto): Promise<Sucursal> {
    const { data } = await apiClient.patch<Sucursal>(`/sucursales/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/sucursales/${id}`);
  },
};
