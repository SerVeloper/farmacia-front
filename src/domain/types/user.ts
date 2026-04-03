export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  sucursalId: string | null;
  activo: boolean;
  ultimoAcceso: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CreateUserDto {
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  sucursalId?: string | null;
}

export interface UpdateUserDto {
  nombre?: string;
  email?: string;
  rol?: UserRole;
  sucursalId?: string | null;
  activo?: boolean;
}
