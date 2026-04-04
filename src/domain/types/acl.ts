import type { CanonicalUserRole, UserRole } from '@/domain/types/user';
import { normalizeUserRole } from '@/domain/types/user';

export type AclModule =
  | 'inicio'
  | 'inventario'
  | 'compras'
  | 'ventas'
  | 'caja'
  | 'reportes'
  | 'configuracion';

export type AclAction = 'ver' | 'crear' | 'editar' | 'eliminar' | 'exportar' | 'cerrar';

export interface AclPermission {
  modulo: AclModule;
  accion: AclAction;
}

type RolePermissionMatrix = Record<CanonicalUserRole, Partial<Record<AclModule, AclAction[]>>>;

const ACL_MATRIX: RolePermissionMatrix = {
  administrador: {
    inicio: ['ver'],
    inventario: ['ver', 'crear', 'editar', 'eliminar'],
    compras: ['ver', 'crear', 'editar', 'eliminar'],
    ventas: ['ver', 'crear', 'editar', 'eliminar'],
    caja: ['ver', 'crear', 'editar', 'cerrar'],
    reportes: ['ver', 'exportar'],
    configuracion: ['ver', 'crear', 'editar', 'eliminar'],
  },
  contador: {
    inicio: ['ver'],
    reportes: ['ver', 'exportar'],
  },
  regente: {
    inicio: ['ver'],
    inventario: ['ver', 'crear', 'editar'],
    compras: ['ver', 'crear', 'editar'],
    ventas: ['ver', 'crear', 'editar'],
    caja: ['ver', 'crear', 'cerrar'],
    reportes: ['ver'],
    configuracion: [],
  },
  vendedor: {
    inicio: ['ver'],
    inventario: ['ver'],
    ventas: ['ver', 'crear'],
    caja: ['ver', 'crear'],
  },
};

export function hasAclPermission(role: UserRole | null | undefined, permission: AclPermission): boolean {
  const canonicalRole = normalizeUserRole(role);

  if (!canonicalRole) {
    return false;
  }

  const rolePermissions = ACL_MATRIX[canonicalRole][permission.modulo] ?? [];
  return rolePermissions.includes(permission.accion);
}
