export type CanonicalUserRole =
  | 'administrador'
  | 'contador'
  | 'regente'
  | 'vendedor';

export type LegacyUserRole = 'admin' | 'manager' | 'cashier';

export type UserRole = CanonicalUserRole | LegacyUserRole;

export const CANONICAL_ROLES: CanonicalUserRole[] = [
  'administrador',
  'contador',
  'regente',
  'vendedor',
];

export const LEGACY_TO_CANONICAL_ROLE: Record<LegacyUserRole, CanonicalUserRole> = {
  admin: 'administrador',
  manager: 'regente',
  cashier: 'vendedor',
};

export const CANONICAL_TO_LEGACY_ROLE: Record<CanonicalUserRole, LegacyUserRole> = {
  administrador: 'admin',
  contador: 'manager',
  regente: 'manager',
  vendedor: 'cashier',
};

export const ROLE_LABELS: Record<CanonicalUserRole, string> = {
  administrador: 'Administrador',
  contador: 'Contador',
  regente: 'Regente',
  vendedor: 'Vendedor',
};

export function normalizeUserRole(role: string | null | undefined): CanonicalUserRole | null {
  if (!role) return null;

  const normalized = role.toLowerCase() as UserRole;

  if (normalized in LEGACY_TO_CANONICAL_ROLE) {
    return LEGACY_TO_CANONICAL_ROLE[normalized as LegacyUserRole];
  }

  if (CANONICAL_ROLES.includes(normalized as CanonicalUserRole)) {
    return normalized as CanonicalUserRole;
  }

  return null;
}

export function getRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeUserRole(role);

  if (!normalized) {
    return role || 'Sin rol';
  }

  return ROLE_LABELS[normalized];
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  roles?: Array<{ codigo: CanonicalUserRole; nombre?: string }>;
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
  rol?: UserRole;
  rolesCodigos?: CanonicalUserRole[];
  sucursalId?: string | null;
}

export interface UpdateUserDto {
  nombre?: string;
  email?: string;
  rol?: UserRole;
  rolesCodigos?: CanonicalUserRole[];
  sucursalId?: string | null;
  activo?: boolean;
}
