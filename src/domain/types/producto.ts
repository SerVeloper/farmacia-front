export interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  categoriaId: string | null;
  marcaId: string | null;
  principioActivo: string | null;
  unidad: string;
  precioCompra: number;
  precioVenta: number;
  margen: number;
  stockMinimo: number;
  stockMaximo: number;
  esControlado: boolean;
  /**
   * R1: clasificacion explicita de medicamento. Habilita lote/vencimiento
   * obligatorio en compra y asignacion FEFO automatica en venta.
   * El default `false` en DB solo sirve para compatibilidad del legado
   * (R1.4); NO es una decision humana y no debe inferirse de
   * `esControlado`, categoria ni principio activo.
   */
  esMedicamento: boolean;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * R1.1: `CreateProductoDto.esMedicamento` es REQUERIDO en el alta.
 * No se admite la ausencia como `false` implicito: la UI debe enviar una
 * decision explicita (si/no). El backend responde 400 si falta.
 *
 * R1.5: `UpdateProductoDto` hereda `Partial<CreateProductoDto>`, por lo que
 * `esMedicamento` queda OPCIONAL y, si se omite, el backend preserva el valor
 * almacenado (no reclasifica).
 */
export interface CreateProductoDto {
  nombre: string;
  codigo?: string;
  categoriaId?: string;
  marcaId?: string;
  principioActivo?: string;
  unidad?: string;
  precioCompra?: number;
  precioVenta?: number;
  margen?: number;
  stockMinimo?: number;
  stockMaximo?: number;
  esControlado?: boolean;
  esMedicamento: boolean;
  descripcion?: string;
}

export interface UpdateProductoDto extends Partial<CreateProductoDto> {
  activo?: boolean;
}

/**
 * R1: lectura honesta de la clasificacion. Devuelve `null` cuando el backend NO
 * informo el campo, para que la vista lo trate como "desconocido" y NO lo
 * convierta en `false` por defecto.
 *
 * R1.4: el default `false` de la migracion es compatibilidad del legado, no una
 * decision humana. R1.5: en edicion se preserva el valor conocido; si es
 * desconocido, el campo se omite del payload y el backend conserva el almacenado.
 */
export function leerEsMedicamento(producto: unknown): boolean | null {
  if (!producto || typeof producto !== 'object') return null;
  const valor = (producto as { esMedicamento?: unknown }).esMedicamento;
  return typeof valor === 'boolean' ? valor : null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}