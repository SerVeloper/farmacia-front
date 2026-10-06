export interface UnidadMedida {
  id: string;
  nombre: string;
  abreviatura: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CreateUnidadMedidaDto {
  nombre: string;
  abreviatura: string;
  descripcion?: string;
}

export interface UpdateUnidadMedidaDto extends Partial<CreateUnidadMedidaDto> {
  activo?: boolean;
}
