import apiClient from '@/infrastructure/api/client';
import type {
  Caja,
  CajaSalesSummaryResponse,
  CloseCajaDto,
  OpenCajaDto,
} from '@/domain/types/caja';

export const cajasApi = {
  async open(dto: OpenCajaDto): Promise<Caja> {
    const { data } = await apiClient.post<Caja>('/cajas/open', dto);
    return data;
  },

  async close(cajaId: string, dto: CloseCajaDto): Promise<Caja> {
    const { data } = await apiClient.post<Caja>(`/cajas/${cajaId}/close`, dto);
    return data;
  },

  async getCurrent(sucursalId: string): Promise<Caja[]> {
    const { data } = await apiClient.get<Caja[]>('/cajas/current', {
      params: { sucursalId },
    });
    return data;
  },

  async getSalesSummary(sucursalId: string): Promise<CajaSalesSummaryResponse> {
    const { data } = await apiClient.get<CajaSalesSummaryResponse>(
      '/cajas/sales-summary',
      {
        params: { sucursalId },
      },
    );
    return data;
  },
};
