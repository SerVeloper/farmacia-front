export interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CreateSucursalDto {
  codigo: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface UpdateSucursalDto {
  codigo?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  activo?: boolean;
}
