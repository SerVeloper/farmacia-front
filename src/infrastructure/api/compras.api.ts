import apiClient from '@/infrastructure/api/client';
import type {
  CompraCatalogoProducto,
  CompraDetalle,
  ComprasListResponse,
  CreateCompraDto,
  Proveedor,
} from '@/domain/types/compra';

export const comprasApi = {
  async getCatalogo(params: { sucursalId?: string; q?: string }) {
    const { data } = await apiClient.get<CompraCatalogoProducto[]>('/compras/catalogo', {
      params,
    });
    return data;
  },

  async create(dto: CreateCompraDto) {
    const { data } = await apiClient.post<CompraDetalle>('/compras', dto);
    return data;
  },

  async getAll(params: Record<string, unknown>) {
    const { data } = await apiClient.get<ComprasListResponse>('/compras', { params });
    return data;
  },

  async getOne(id: string) {
    const { data } = await apiClient.get<CompraDetalle>(`/compras/${id}`);
    return data;
  },

  async getProveedores() {
    const { data } = await apiClient.get<Proveedor[]>('/compras/proveedores/all');
    return data;
  },

  async createProveedor(dto: {
    nombre: string;
    nit?: string;
    telefono?: string;
    direccion?: string;
  }) {
    const { data } = await apiClient.post<Proveedor>('/compras/proveedores', dto);
    return data;
  },
};
