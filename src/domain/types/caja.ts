export type CajaEstado = 'abierta' | 'pausada' | 'cerrada';
export type CajaMetodoPago = 'efectivo' | 'transferencia' | 'mixto';

export interface Caja {
  id: string;
  numeroCaja: string;
  sucursalId: string;
  usuarioAperturaId: string;
  estado: CajaEstado;
  fechaApertura: string;
  montoApertura: number;
  fechaCierre: string | null;
  usuarioCierreId: string | null;
  montoCierreEsperado: number | null;
  montoCierreReal: number | null;
  diferencia: number | null;
  observacionCierre: string | null;
}

export interface OpenCajaDto {
  sucursalId: string;
  montoApertura: number;
}

export interface CloseCajaDto {
  montoCierreReal: number;
  observacion?: string;
}

export interface CajaSalesSummaryItem {
  id: string;
  numeroCaja: string;
  fechaHora: string;
  usuarioId: string;
  usuarioNombre: string;
  metodoPago: CajaMetodoPago | null;
  numeroVenta: string;
  total: number;
  detalle: string | null;
}

export interface CajaSalesSummaryResponse {
  totals: {
    efectivo: number;
    transferencia: number;
    mixto: number;
    general: number;
  };
  items: CajaSalesSummaryItem[];
}
