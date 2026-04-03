export interface Marca {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CreateMarcaDto {
  nombre: string;
  descripcion?: string;
}

export interface UpdateMarcaDto extends Partial<CreateMarcaDto> {
  activo?: boolean;
}