import { Icons } from '@/presentation/config/icons';
import type { AclPermission } from '@/domain/types/acl';

export interface NavigationLeafItem {
  nombre: string;
  ruta: string;
  icono: string;
  permiso: AclPermission;
}

export interface NavigationGroup {
  nombre: string;
  icono: string;
  modulo: AclPermission['modulo'];
  items: NavigationLeafItem[];
}

export const DASHBOARD_ITEM: NavigationLeafItem = {
  nombre: 'Inicio',
  ruta: '/',
  icono: Icons.home,
  permiso: { modulo: 'inicio', accion: 'ver' },
};

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    nombre: 'Inventario',
    icono: Icons.inventory,
    modulo: 'inventario',
    items: [
      {
        nombre: 'Productos',
        ruta: '/inventario/productos',
        icono: Icons.producto,
        permiso: { modulo: 'inventario', accion: 'ver' },
      },
      {
        nombre: 'Marcas',
        ruta: '/inventario/marcas',
        icono: Icons.marca,
        permiso: { modulo: 'inventario', accion: 'ver' },
      },
      {
        nombre: 'Categorias',
        ruta: '/inventario/categorias',
        icono: Icons.categoria,
        permiso: { modulo: 'inventario', accion: 'ver' },
      },
    ],
  },
  {
    nombre: 'Compras',
    icono: Icons.shopping,
    modulo: 'compras',
    items: [
      {
        nombre: 'Compras',
        ruta: '/compras/compras',
        icono: Icons.clipboard,
        permiso: { modulo: 'compras', accion: 'ver' },
      },
      {
        nombre: 'Nueva compra',
        ruta: '/compras/nueva',
        icono: Icons.plus,
        permiso: { modulo: 'compras', accion: 'ver' },
      },
      {
        nombre: 'Ordenes de compra',
        ruta: '/compras/ordenes',
        icono: Icons.shopping,
        permiso: { modulo: 'compras', accion: 'ver' },
      },
    ],
  },
  {
    nombre: 'Ventas',
    icono: Icons.sales,
    modulo: 'ventas',
    items: [
      {
        nombre: 'Ventas',
        ruta: '/ventas/ventas',
        icono: Icons.cash,
        permiso: { modulo: 'ventas', accion: 'ver' },
      },
      {
        nombre: 'Nueva venta',
        ruta: '/ventas/nueva',
        icono: Icons.plus,
        permiso: { modulo: 'ventas', accion: 'ver' },
      },
      {
        nombre: 'Cotizacion',
        ruta: '/ventas/cotizacion',
        icono: Icons.clipboard,
        permiso: { modulo: 'ventas', accion: 'ver' },
      },
    ],
  },
  {
    nombre: 'Caja',
    icono: Icons.box,
    modulo: 'caja',
    items: [
      {
        nombre: 'Inicio de caja',
        ruta: '/caja/inicio',
        icono: Icons.plus,
        permiso: { modulo: 'caja', accion: 'ver' },
      },
      {
        nombre: 'Cierre de caja',
        ruta: '/caja/cierre',
        icono: Icons.check,
        permiso: { modulo: 'caja', accion: 'ver' },
      },
    ],
  },
  {
    nombre: 'Reportes',
    icono: Icons.report,
    modulo: 'reportes',
    items: [
      {
        nombre: 'Reporte de compras',
        ruta: '/reportes/compras',
        icono: Icons.shopping,
        permiso: { modulo: 'reportes', accion: 'ver' },
      },
      {
        nombre: 'Reporte de ventas',
        ruta: '/reportes/ventas',
        icono: Icons.sales,
        permiso: { modulo: 'reportes', accion: 'ver' },
      },
      {
        nombre: 'Reporte de inventario',
        ruta: '/reportes/inventario',
        icono: Icons.inventory,
        permiso: { modulo: 'reportes', accion: 'ver' },
      },
    ],
  },
  {
    nombre: 'Configuracion',
    icono: Icons.settings,
    modulo: 'configuracion',
    items: [
      {
        nombre: 'Sucursales',
        ruta: '/configuracion/sucursales',
        icono: Icons.box,
        permiso: { modulo: 'configuracion', accion: 'ver' },
      },
      {
        nombre: 'Usuarios',
        ruta: '/configuracion/usuarios',
        icono: Icons.user,
        permiso: { modulo: 'configuracion', accion: 'ver' },
      },
      {
        nombre: 'Roles',
        ruta: '/configuracion/roles',
        icono: Icons.settings,
        permiso: { modulo: 'configuracion', accion: 'ver' },
      },
      {
        nombre: 'Cargos',
        ruta: '/configuracion/cargos',
        icono: Icons.clipboard,
        permiso: { modulo: 'configuracion', accion: 'ver' },
      },
    ],
  },
];
