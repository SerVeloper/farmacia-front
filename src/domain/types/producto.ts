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
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

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
  descripcion?: string;
}

export interface UpdateProductoDto extends Partial<CreateProductoDto> {
  activo?: boolean;
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