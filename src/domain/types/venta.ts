export type VentaMetodoPago = 'efectivo' | 'transferencia';

export interface VentaCatalogoProducto {
  inventarioId: string;
  productoId: string;
  codigo: string;
  nombre: string;
  precioVenta: number;
  stockActual: number;
}

export interface VentaCreateItemDto {
  productoId: string;
  cantidad: number;
  descuentoMonto?: number;
}

export interface VentaCreatePagoDto {
  metodoPago: VentaMetodoPago;
  monto: number;
  referencia?: string;
}

export interface CreateVentaDto {
  sucursalId: string;
  descuentoGlobal?: number;
  items: VentaCreateItemDto[];
  pagos: VentaCreatePagoDto[];
}

export interface VentaResumen {
  id: string;
  numeroVenta: string;
  sucursalId: string;
  sucursalNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  subtotal: number;
  descuentoTotal: number;
  total: number;
  estado: string;
  fechaCreacion: string;
}

export interface VentaDetalleItem {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  descuentoMonto: number;
  subtotal: number;
  nombreProducto: string;
  codigoProducto: string;
}

export interface VentaDetallePago {
  id: string;
  metodoPago: VentaMetodoPago;
  monto: number;
  referencia: string | null;
}

export interface VentaDetalle {
  id: string;
  numeroVenta: string;
  sucursalId: string;
  cajaId: string;
  vendedorId: string;
  subtotal: number;
  descuentoTotal: number;
  total: number;
  estado: string;
  fechaCreacion: string;
  items: VentaDetalleItem[];
  pagos: VentaDetallePago[];
}

export interface VentasListResponse {
  data: VentaResumen[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VentasQuery {
  sucursalId?: string;
  vendedorId?: string;
  numeroVenta?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}
