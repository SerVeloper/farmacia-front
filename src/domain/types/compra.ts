export type CompraMetodoPago = 'efectivo' | 'transferencia' | 'mixto';
export type CompraPagoMetodo = 'efectivo' | 'transferencia';
export type CompraTipoComprobante = 'factura' | 'nota_venta' | 'recibo' | 'otro';

export interface Proveedor {
  id: string;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface CompraCatalogoProducto {
  productoId: string;
  id?: string;
  codigo: string;
  nombre: string;
  principioActivo: string | null;
  precioCompra: number;
  precioVenta: number;
  stockActual: number;
  /**
   * R9: alertas informativas de vencimiento del producto en la sucursal.
   * Opcionales: si el backend no las envia, la UI no inventa cortes ni umbrales.
   */
  alertasVencimiento?: CompraAlertaVencimiento[];
}

/**
 * R9: alerta informativa de vencimiento en compra.
 * Contrato canonico: flags `proximoVencimiento`, `diasParaVencer`, `vencido`,
 * `diasVencido` (R9.1/R9.2) y, en la respuesta, `tipo` + `mensaje` (R9.3).
 * Ninguno de esos campos bloquea la compra (R9 / R4.3).
 */
export interface CompraAlertaVencimiento {
  // El detalle historico de compra conserva numero y fecha, no siempre loteId.
  loteId?: string;
  numeroLote: string;
  fechaVencimiento: string;
  cantidad: number;
  vencido: boolean;
  proximoVencimiento?: boolean;
  diasParaVencer?: number;
  diasVencido?: number;
  tipo?: 'vencido' | 'proximo';
  mensaje?: string;
}

export interface QuickCreateProductoCompraDto {
  nombre: string;
  principioActivo: string;
  marcaId: string;
  categoriaId: string;
}

export interface CreateCompraItemDto {
  productoId?: string;
  productoNuevo?: QuickCreateProductoCompraDto;
  cantidadCompra: number;
  unidadCompra: string;
  factor: number;
  costoCompraUnitario: number;
  /**
   * R4: el API sigue recibiendo `numeroLote` + `fechaVencimiento` (nunca `loteId`).
   * Obligatorios cuando el producto es medicamento; opcionales si no lo es.
   * Un vencimiento pasado informa y nunca bloquea (R4.3).
   */
  lote?: string;
  fechaVencimiento?: string;
  descuentoMonto?: number;
  margen: number;
  precioVenta: number;
}

export interface CreateCompraPagoDto {
  metodoPago: CompraPagoMetodo;
  monto: number;
  referencia?: string;
}

export interface CreateCompraDto {
  sucursalId: string;
  proveedorId: string;
  metodoPago: CompraMetodoPago;
  tipoComprobante: CompraTipoComprobante;
  numeroComprobante: string;
  descuentoGlobal?: number;
  items: CreateCompraItemDto[];
  pagos: CreateCompraPagoDto[];
}

export interface CompraResumen {
  id: string;
  numeroCompra: string;
  sucursalId: string;
  sucursalNombre: string;
  proveedorId: string;
  proveedorNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  metodoPago: CompraMetodoPago;
  tipoComprobante: CompraTipoComprobante;
  numeroComprobante: string;
  subtotal: number;
  descuentoTotal: number;
  total: number;
  fechaCreacion: string;
}

export interface CompraDetalle extends CompraResumen {
  alertasVencimiento?: CompraAlertaVencimiento[];
  resumenVencimientos?: {
    diasAlerta: number;
    totalAlertas: number;
    vencidos: number;
    proximos: number;
  };
  items: Array<{
    id: string;
    productoId: string;
    nombreProducto: string;
    codigoProducto: string;
    cantidadCompra: number;
    unidadCompra: string;
    factor: number;
    cantidadUnidadesIngreso: number;
    costoCompraUnitario: number;
    costoUnitarioResultante: number;
    descuentoMonto: number;
    lote: string | null;
    fechaVencimiento: string | null;
    margen: number;
    precioVenta: number;
    subtotal: number;
    alertas?: CompraAlertaVencimiento[];
  }>;
  pagos: Array<{
    id: string;
    metodoPago: CompraPagoMetodo;
    monto: number;
    referencia: string | null;
  }>;
}

export interface ComprasListResponse {
  data: CompraResumen[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
