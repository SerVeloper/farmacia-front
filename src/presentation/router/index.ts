import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/application/stores/auth.store';
import type { UserRole } from '@/domain/types/user';

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
      path: '/',
      name: 'home',
      component: () => import('@/presentation/pages/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('@/presentation/pages/UsuariosPage.vue'),
      meta: {
        requiresAuth: true,
        roles: ['admin'] as UserRole[],
      },
    },
    {
      path: '/sucursales',
      name: 'sucursales',
      component: () => import('@/presentation/pages/SucursalesPage.vue'),
      meta: {
        requiresAuth: true,
        roles: ['admin'] as UserRole[],
      },
    },
    {
      path: '/productos',
      name: 'productos',
      component: () => import('@/presentation/pages/ProductosPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/marcas',
      name: 'marcas',
      component: () => import('@/presentation/pages/MarcasPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/categorias',
      name: 'categorias',
      component: () => import('@/presentation/pages/CategoriasPage.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    await authStore.refreshProfile();
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

  if (to.meta.roles && Array.isArray(to.meta.roles)) {
    if (!authStore.hasRole(to.meta.roles as UserRole[])) {
      return { name: 'home' };
    }
  }

  return true;
});

export default router;
