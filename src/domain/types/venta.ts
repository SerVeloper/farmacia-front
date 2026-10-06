export type VentaMetodoPago = 'efectivo' | 'transferencia';

export interface VentaCatalogoProducto {
  inventarioId: string;
  productoId: string;
  codigo: string;
  nombre: string;
  principioActivo?: string | null;
  precioVenta: number;
  stockActual: number;
  /**
   * R9: alertas informativas por producto en la sucursal activa.
   * Opcionales: sin este dato la UI no inventa umbrales ni fechas.
   */
  alertasVencimiento?: VentaAlertaVencimiento[];
}

/**
 * R6: el request de venta NO acepta seleccion de lote. El backend asigna
 * automaticamente por FEFO (vencimiento ASC, lote_id ASC) e incluye vencidos.
 * `VentaCreateItemDto` no debe crecer con `loteId`/`numeroLote`.
 */
export interface VentaCreateItemDto {
  productoId: string;
  cantidad: number;
  descuentoMonto?: number;
}

/**
 * R5 / R6: asignacion hija de un `VentaItem` hacia un lote (FEFO multi-lote).
 * El backend persiste la asignacion y responde una entrada por lote
 * efectivamente descontado. No altera precio ni cantidad del item.
 *
 * CONTRATO CANONICO (R6 + R9.4): los hijos viven en `items[].asignaciones`
 * (NO en `items[].lotes`) y exponen los flags de R9: `proximoVencimiento`,
 * `diasParaVencer`, `vencido`, `diasVencido`.
 */
export interface VentaAsignacionLote {
  loteId: string;
  numeroLote: string;
  fechaVencimiento: string;
  /** R5: unidades de este lote dentro del item (FEFO puede repartir el item). */
  cantidad: number;
  /** R9.1/R9.2: flags informativos calculados con el umbral del servidor. */
  proximoVencimiento?: boolean;
  diasParaVencer?: number;
  vencido: boolean;
  diasVencido?: number;
}

/**
 * R9: alerta informativa de vencimiento.
 *
 * CONTRATO CANONICO:
 *  - R9.1 `proximoVencimiento` + `diasParaVencer`
 *  - R9.2 `vencido` + `diasVencido`
 *  - R9.3 en respuestas de compra/venta: `tipo` ('vencido' | 'proximo') y `mensaje`
 *
 * `diasRestantes` ya NO forma parte del contrato: queda fuera de la vista de
 * dominio. La UI nunca recalcula el corte (umbral del backend, Joi, R9.5).
 */
export interface VentaAlertaVencimiento {
  productoId: string;
  nombreProducto: string;
  loteId: string;
  numeroLote: string;
  fechaVencimiento: string;
  cantidad: number;
  tipo: 'vencido' | 'proximo';
  vencido: boolean;
  proximoVencimiento: boolean;
  diasParaVencer?: number;
  diasVencido?: number;
  mensaje?: string;
}

/**
 * R9: resumen no bloqueante. `diasAlerta` es el umbral vigente del servidor
 * (`LOTES_ALERTA_PROXIMO_VENCIMIENTO_DIAS`, Joi, default 90 dias).
 * Llega `null` cuando el backend no informa el corte: la UI muestra conteos
 * sin inventar la ventana.
 */
export interface VentaResumenVencimientos {
  diasAlerta: number | null;
  totalAlertas: number;
  vencidos: number;
  proximos: number;
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
  /**
   * R5 / R6: asignaciones FEFO del item en `items[].asignaciones` (canonical).
   * Vacio/ausente para no medicamentos (R10).
   */
  asignaciones?: VentaAsignacionLote[];
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
  /** R4.3 / R5.2 / R9: avisos de vencido y proximo vencimiento. Informativos. */
  alertasVencimiento?: VentaAlertaVencimiento[];
  /** R9: conteos + umbral vigente del servidor. Informativo, no bloquea. */
  resumenVencimientos?: VentaResumenVencimientos;
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
