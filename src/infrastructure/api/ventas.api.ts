import apiClient from '@/infrastructure/api/client';
import type {
  CreateVentaDto,
  VentaCatalogoProducto,
  VentaDetalle,
  VentasListResponse,
  VentasQuery,
} from '@/domain/types/venta';

export const ventasApi = {
  async getCatalogo(params: { sucursalId?: string; q?: string }) {
    const { data } = await apiClient.get<VentaCatalogoProducto[]>('/ventas/catalogo', {
      params,
    });
    return data;
  },

  async create(dto: CreateVentaDto) {
    const { data } = await apiClient.post<VentaDetalle>('/ventas', dto);
    return data;
  },

  async getAll(params: VentasQuery) {
    const { data } = await apiClient.get<VentasListResponse>('/ventas', {
      params,
    });
    return data;
  },

  async getOne(id: string) {
    const { data } = await apiClient.get<VentaDetalle>(`/ventas/${id}`);
    return data;
  },
};
