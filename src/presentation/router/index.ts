import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/application/stores/auth.store';
import type { AclPermission } from '@/domain/types/acl';

type RouteMetaWithAcl = Record<PropertyKey, unknown> & {
  requiresAuth?: boolean;
  publicOnly?: boolean;
  layout?: 'auth';
  acl?: AclPermission;
  pageTitle?: string;
};

function secureMeta(acl: AclPermission, pageTitle?: string): RouteMetaWithAcl {
  return {
    requiresAuth: true,
    acl,
    pageTitle,
  };
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/presentation/pages/LoginPage.vue'),
      meta: {
        publicOnly: true,
        layout: 'auth',
      },
    },
    {
      path: '/password/forgot',
      name: 'password-forgot',
      component: () => import('@/presentation/pages/ForgotPasswordPage.vue'),
      meta: {
        publicOnly: true,
        layout: 'auth',
      },
    },
    {
      path: '/password/reset',
      name: 'password-reset',
      component: () => import('@/presentation/pages/ResetPasswordPage.vue'),
      meta: {
        publicOnly: true,
        layout: 'auth',
      },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/presentation/pages/HomePage.vue'),
      meta: secureMeta({ modulo: 'inicio', accion: 'ver' }),
    },
    {
      path: '/inventario/productos',
      name: 'inventario-productos',
      component: () => import('@/presentation/pages/ProductosPage.vue'),
      meta: secureMeta({ modulo: 'inventario', accion: 'ver' }),
    },
    {
      path: '/inventario/marcas',
      name: 'inventario-marcas',
      component: () => import('@/presentation/pages/MarcasPage.vue'),
      meta: secureMeta({ modulo: 'inventario', accion: 'ver' }),
    },
    {
      path: '/inventario/categorias',
      name: 'inventario-categorias',
      component: () => import('@/presentation/pages/CategoriasPage.vue'),
      meta: secureMeta({ modulo: 'inventario', accion: 'ver' }),
    },
    {
      path: '/compras/compras',
      name: 'compras-compras',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'compras', accion: 'ver' }, 'Compras'),
    },
    {
      path: '/compras/nueva',
      name: 'compras-nueva',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'compras', accion: 'ver' }, 'Nueva compra'),
    },
    {
      path: '/compras/ordenes',
      name: 'compras-ordenes',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'compras', accion: 'ver' }, 'Ordenes de compra'),
    },
    {
      path: '/ventas/ventas',
      name: 'ventas-ventas',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'ventas', accion: 'ver' }, 'Ventas'),
    },
    {
      path: '/ventas/nueva',
      name: 'ventas-nueva',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'ventas', accion: 'ver' }, 'Nueva venta'),
    },
    {
      path: '/ventas/cotizacion',
      name: 'ventas-cotizacion',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'ventas', accion: 'ver' }, 'Cotizacion'),
    },
    {
      path: '/caja',
      name: 'caja',
      component: () => import('@/presentation/pages/CajaPage.vue'),
      meta: secureMeta({ modulo: 'caja', accion: 'ver' }, 'Caja'),
    },
    {
      path: '/reportes/compras',
      name: 'reportes-compras',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'reportes', accion: 'ver' }, 'Reporte de compras'),
    },
    {
      path: '/reportes/ventas',
      name: 'reportes-ventas',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'reportes', accion: 'ver' }, 'Reporte de ventas'),
    },
    {
      path: '/reportes/inventario',
      name: 'reportes-inventario',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'reportes', accion: 'ver' }, 'Reporte de inventario'),
    },
    {
      path: '/configuracion/sucursales',
      name: 'configuracion-sucursales',
      component: () => import('@/presentation/pages/SucursalesPage.vue'),
      meta: secureMeta({ modulo: 'configuracion', accion: 'ver' }),
    },
    {
      path: '/configuracion/usuarios',
      name: 'configuracion-usuarios',
      component: () => import('@/presentation/pages/UsuariosPage.vue'),
      meta: secureMeta({ modulo: 'configuracion', accion: 'ver' }),
    },
    {
      path: '/configuracion/roles',
      name: 'configuracion-roles',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'configuracion', accion: 'ver' }, 'Roles'),
    },
    {
      path: '/configuracion/cargos',
      name: 'configuracion-cargos',
      component: () => import('@/presentation/pages/PlaceholderPage.vue'),
      meta: secureMeta({ modulo: 'configuracion', accion: 'ver' }, 'Cargos'),
    },
    {
      path: '/productos',
      redirect: '/inventario/productos',
    },
    {
      path: '/marcas',
      redirect: '/inventario/marcas',
    },
    {
      path: '/categorias',
      redirect: '/inventario/categorias',
    },
    {
      path: '/usuarios',
      redirect: '/configuracion/usuarios',
    },
    {
      path: '/sucursales',
      redirect: '/configuracion/sucursales',
    },
    {
      path: '/compras/proveedores',
      redirect: '/compras/compras',
    },
    {
      path: '/ventas/pos',
      redirect: '/ventas/ventas',
    },
    {
      path: '/ventas/historial',
      redirect: '/ventas/ventas',
    },
    {
      path: '/caja/apertura',
      redirect: '/caja',
    },
    {
      path: '/caja/movimientos',
      redirect: '/caja',
    },
    {
      path: '/caja/inicio',
      redirect: '/caja',
    },
    {
      path: '/caja/cierre',
      redirect: '/caja',
    },
    {
      path: '/reportes/caja',
      redirect: '/reportes/ventas',
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!to.meta.publicOnly) {
    await authStore.initializeSession();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  if (to.meta.publicOnly && authStore.isAuthenticated) {
    return { name: 'home' };
  }

  const acl = to.meta.acl as AclPermission | undefined;

  if (acl && !authStore.canAccess(acl.modulo, acl.accion)) {
      return { name: 'home' };
  }

  return true;
});

export default router;
