/**
 * Entidad Servicio (ej. "Aplicación de Inyectable").
 *
 * A diferencia de Producto: catálogo GLOBAL sin inventario, sin lote y sin
 * vencimiento; y SIN costo/margen — regla de negocio: el servicio solo tiene
 * precio de venta.
 *
 * La baja es SOFT-DELETE vía `activo=false` (la API NO expone DELETE).
 * Los timestamps llegan en inglés (`createdAt`/`updatedAt`), a diferencia
 * de los catálogos antiguos que usaban `fechaCreacion`/`fechaActualizacion`.
 */
export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioVenta: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicioDto {
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  activo?: boolean;
}

/** PATCH parcial: todos los campos de creación son opcionales. */
export interface UpdateServicioDto extends Partial<CreateServicioDto> {}
