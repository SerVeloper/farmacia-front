import { computed, type ComputedRef } from 'vue';

import type {
  VentaAlertaVencimiento,
  VentaAsignacionLote,
  VentaDetalle,
  VentaResumenVencimientos,
} from '@/domain/types/venta';

/**
 * R4.3 / R5.2 / R9 — vencimientos SIEMPRE informativos.
 *
 * Reglas que este modulo respeta a proposito:
 *  - NO existe ningun umbral de dias hardcodeado. El corte lo decide el backend
 *    (configurable por Joi, R9.5) y llega ya resuelto en los flags R9:
 *    `proximoVencimiento`, `diasParaVencer`, `vencido`, `diasVencido`.
 *  - NO se rechaza una fecha de vencimiento pasada ni se exige fecha futura.
 *  - NO hay selector de lote ni confirmacion del cajero (R6).
 *  - NO se deshabilita la venta de un lote vencido (R5.2: FEFO incluye vencidos).
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}/;

function toDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  return match ? match[0] : null;
}

/** Compara fechas `YYYY-MM-DD` en hora local, sin corrimiento por UTC. */
export function esFechaVencida(fechaVencimiento: string, hoy: Date = new Date()): boolean {
  const fecha = toDateOnly(fechaVencimiento);
  if (!fecha) return false;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const referencia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const objetivo = new Date(anio, mes - 1, dia);

  return objetivo.getTime() < referencia.getTime();
}

/** Dias restantes hasta la fecha. Solo uso informativo, nunca como corte. */
export function diasHastaVencimiento(fechaVencimiento: string, hoy: Date = new Date()): number | null {
  const dias = diasHastaVencimientoAbsoluto(fechaVencimiento, hoy);
  return dias === null ? null : dias;
}

function diasHastaVencimientoAbsoluto(fechaVencimiento: string, hoy: Date = new Date()): number | null {
  const fecha = toDateOnly(fechaVencimiento);
  if (!fecha) return null;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const referencia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const objetivo = new Date(anio, mes - 1, dia);

  return Math.round((objetivo.getTime() - referencia.getTime()) / 86400000);
}

/** R9.2: dias YA vencidos (magnitud positiva). Derivado solo de la fecha. */
export function diasVencidosAbsolutos(fechaVencimiento: string, hoy: Date = new Date()): number | null {
  const dias = diasHastaVencimientoAbsoluto(fechaVencimiento, hoy);
  return dias === null || dias >= 0 ? (dias === null ? null : 0) : Math.abs(dias);
}

/** Acepta solo numeros finitos: nunca convierte `null`/`''` en 0 inventado. */
function numeroFinito(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

function esRegistroVencimiento(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Normaliza la lista de alertas del backend respetando los nombres canonicos de
 * R9. Descarta entradas sin lote o sin fecha utilizable en lugar de inventar
 * informacion, y NO recalcula el corte: si el servidor ya envio
 * `diasParaVencer` / `diasVencido`, se respetan; si no, solo se deriva
 * `diasVencido` de la fecha (informativo, nunca habilita ni bloquea).
 */
export function normalizarAlertasVencimiento(raw: unknown, hoy: Date = new Date()): VentaAlertaVencimiento[] {
  if (!Array.isArray(raw)) return [];

  const alertas: VentaAlertaVencimiento[] = [];

  for (const item of raw) {
    if (!esRegistroVencimiento(item)) continue;

    const fechaVencimiento = toDateOnly(item.fechaVencimiento);
    if (!fechaVencimiento) continue;

    // R9.2 manda: `vencido` explicito del servidor. Solo si falta, se deriva de
    // la fecha, y como fallback del `tipo` de R9.3.
    const vencido =
      typeof item.vencido === 'boolean'
        ? item.vencido
        : item.tipo === 'vencido' || esFechaVencida(fechaVencimiento, hoy);

    const diasVencidoBackend = numeroFinito(item.diasVencido);
    const diasVencido = vencido
      ? (diasVencidoBackend !== null ? Math.abs(diasVencidoBackend) : diasVencidosAbsolutos(fechaVencimiento, hoy) ?? undefined)
      : undefined;

    const tipo: VentaAlertaVencimiento['tipo'] =
      item.tipo === 'vencido' || item.tipo === 'proximo' ? item.tipo : vencido ? 'vencido' : 'proximo';

    const proximoVencimiento =
      typeof item.proximoVencimiento === 'boolean'
        ? item.proximoVencimiento
        : !vencido && diasHastaVencimiento(fechaVencimiento, hoy) !== null
          ? (diasHastaVencimiento(fechaVencimiento, hoy) ?? 0) >= 0
          : false;

    alertas.push({
      productoId: texto(item.productoId),
      nombreProducto: texto(item.nombreProducto),
      loteId: texto(item.loteId),
      numeroLote: texto(item.numeroLote),
      fechaVencimiento,
      cantidad: numeroFinito(item.cantidad) ?? 0,
      tipo,
      vencido,
      proximoVencimiento,
      diasParaVencer: proximoVencimiento
        ? numeroFinito(item.diasParaVencer) ?? diasHastaVencimiento(fechaVencimiento, hoy) ?? undefined
        : undefined,
      diasVencido,
      mensaje: texto(item.mensaje) || undefined,
    });
  }

  return alertas;
}

/** Etiqueta visible para un badge informativo. Nunca bloquea la operacion. */
export function etiquetaVencimiento(alerta: Pick<VentaAlertaVencimiento, 'tipo' | 'vencido' | 'diasVencido' | 'diasParaVencer' | 'fechaVencimiento'>): string {
  if (alerta.vencido || alerta.tipo === 'vencido') {
    const dias = alerta.diasVencido ?? diasVencidosAbsolutos(alerta.fechaVencimiento);
    return dias && dias > 0 ? `Vencido (${dias} días)` : 'Vencido';
  }

  const dias = alerta.diasParaVencer ?? diasHastaVencimiento(alerta.fechaVencimiento);
  return dias && dias > 0 ? `Próximo a vencer (${dias} días)` : 'Próximo a vencer';
}

/**
 * R6 / R9.4: asignaciones hijas canonicas en `items[].asignaciones`.
 * No se acepta `items[].lotes`: un nombre de contrato equivisto debe verse como
 * "sin asignaciones" en la UI, nunca como datos reinterpretados en silencio.
 */
export function normalizarAsignaciones(item: unknown): VentaAsignacionLote[] {
  if (!esRegistroVencimiento(item)) return [];

  const raw = item.asignaciones;
  if (!Array.isArray(raw)) return [];

  const asignaciones: VentaAsignacionLote[] = [];

  for (const asignacion of raw) {
    if (!esRegistroVencimiento(asignacion)) continue;

    const fechaVencimiento = toDateOnly(asignacion.fechaVencimiento);
    if (!fechaVencimiento) continue;

    const vencido =
      typeof asignacion.vencido === 'boolean'
        ? asignacion.vencido
        : esFechaVencida(fechaVencimiento);

    const diasParaVencer = numeroFinito(asignacion.diasParaVencer);
    const proximoVencimiento =
      typeof asignacion.proximoVencimiento === 'boolean'
        ? asignacion.proximoVencimiento
        : !vencido && (diasParaVencer ?? diasHastaVencimiento(fechaVencimiento) ?? -1) >= 0;

    asignaciones.push({
      loteId: texto(asignacion.loteId),
      numeroLote: texto(asignacion.numeroLote),
      fechaVencimiento,
      cantidad: numeroFinito(asignacion.cantidad) ?? 0,
      proximoVencimiento,
      diasParaVencer: proximoVencimiento ? diasParaVencer ?? diasHastaVencimiento(fechaVencimiento) ?? undefined : undefined,
      vencido,
      diasVencido: vencido
        ? numeroFinito(asignacion.diasVencido) ?? diasVencidosAbsolutos(fechaVencimiento) ?? undefined
        : undefined,
    });
  }

  return asignaciones;
}

/**
 * R9: el umbral pertenece al backend. Si no llega `diasAlerta`, el resumen se
 * expone con `diasAlerta: null` para que la UI muestre conteos sin inventar el
 * corte (y el texto no afirme una ventana que nadie configuro).
 */
export function normalizarResumenVencimientos(
  raw: unknown,
  alertas: VentaAlertaVencimiento[],
): VentaResumenVencimientos | null {
  const vencidos = alertas.filter((alerta) => alerta.tipo === 'vencido').length;
  const totalAlertas = alertas.length;

  if (!esRegistroVencimiento(raw)) {
    return totalAlertas === 0 ? null : { diasAlerta: null, totalAlertas, vencidos, proximos: 0 };
  }

  const diasAlerta = Number.isFinite(Number(raw.diasAlerta)) ? Number(raw.diasAlerta) : null;
  const vencidosRaw = Number.isFinite(Number(raw.vencidos)) ? Number(raw.vencidos) : vencidos;
  const totalRaw = Number.isFinite(Number(raw.totalAlertas)) ? Number(raw.totalAlertas) : totalAlertas;
  const proximosRaw = Number.isFinite(Number(raw.proximos))
    ? Number(raw.proximos)
    : Math.max(0, totalRaw - vencidosRaw);

  return {
    diasAlerta,
    totalAlertas: totalRaw,
    vencidos: vencidosRaw,
    proximos: proximosRaw,
  };
}

function leerMensajeBackend(error: unknown): string {
  if (!esRegistroVencimiento(error)) return '';
  const response = error.response;
  if (!esRegistroVencimiento(response)) return '';

  const data = response.data;
  if (!esRegistroVencimiento(data)) return '';

  const message = data.message;
  if (Array.isArray(message)) {
    return message
      .map((item) => texto(item))
      .filter(Boolean)
      .join(' ');
  }

  return texto(message);
}

/**
 * R5.4 / R1.6: el backend responde conflicto de reconciliacion cuando el stock
 * total del producto medicamento no esta respaldado por saldos de lote de la
 * sucursal. La UI lo distingue de un simple error de validacion para explicar
 * la accion concreta, sin inventar una pantalla de reconciliacion.
 */
export function esConflictoReconciliacion(error: unknown): boolean {
  const status = esRegistroVencimiento(error) && esRegistroVencimiento(error.response)
    ? Number(error.response.status)
    : NaN;
  const mensaje = leerMensajeBackend(error).toLowerCase();

  if (status === 409 && (mensaje.includes('reconcil') || mensaje.includes('lote'))) return true;
  if (status === 409 && mensaje === '') return true;

  return status !== 409 && mensaje.includes('reconciliaci') && status >= 400 && status < 500;
}

/** Mensaje accionable que conserva el detalle del backend. */
export function mensajeErrorVenta(error: unknown): string {
  const detalle = leerMensajeBackend(error);

  if (esConflictoReconciliacion(error)) {
    const base =
      'La venta no se registro y no se desconto inventario: el stock del producto medicamento ' +
      'no esta respaldado por saldos de lote de esta sucursal.';
    return detalle ? `${base} Detalle del servidor: ${detalle}` : base;
  }

  return detalle || 'No se pudo registrar la venta';
}

export interface AlertasVencimientoEstado {
  alertas: ComputedRef<VentaAlertaVencimiento[]>;
  resumen: ComputedRef<VentaResumenVencimientos | null>;
  vencidas: ComputedRef<VentaAlertaVencimiento[]>;
  hayAlertas: ComputedRef<boolean>;
  asignacionesPorItem: ComputedRef<Record<string, VentaAsignacionLote[]>>;
  itemsConAsignacionVencida: ComputedRef<string[]>;
}

/**
 * Consolida la respuesta de venta (detalle o resultado recien creado) en alertas
 * informativas. `VentaDetalle.alertasVencimiento` y `.resumenVencimientos` son
 * parte del contrato asumido; si el backend aun no los envia, devuelve vacio
 * y la UI simplemente no muestra avisos.
 */
export function useAlertasVencimiento(
  venta: () => VentaDetalle | null | undefined,
): AlertasVencimientoEstado {
  const alertas = computed(() => normalizarAlertasVencimiento(venta()?.alertasVencimiento));
  const resumen = computed(() => normalizarResumenVencimientos(venta()?.resumenVencimientos, alertas.value));
  const vencidas = computed(() => alertas.value.filter((alerta) => alerta.vencido || alerta.tipo === 'vencido'));

  const asignacionesPorItem = computed(() => {
    const items = venta()?.items ?? [];
    const resultado: Record<string, VentaAsignacionLote[]> = {};

    for (const item of items) {
      const asignaciones = normalizarAsignaciones(item);
      if (asignaciones.length > 0) {
        resultado[item.id] = asignaciones;
      }
    }

    return resultado;
  });

  const itemsConAsignacionVencida = computed(() =>
    Object.entries(asignacionesPorItem.value)
      .filter(([, asignaciones]) => asignaciones.some((asignacion) => asignacion.vencido))
      .map(([itemId]) => itemId),
  );

  return {
    alertas,
    resumen,
    vencidas,
    hayAlertas: computed(() => alertas.value.length > 0),
    asignacionesPorItem,
    itemsConAsignacionVencida,
  };
}
