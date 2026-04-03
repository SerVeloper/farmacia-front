import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/presentation/pages/HomePage.vue')
    },
    {
      path: '/productos',
      name: 'productos',
      component: () => import('@/presentation/pages/ProductosPage.vue')
    },
    {
      path: '/marcas',
      name: 'marcas',
      component: () => import('@/presentation/pages/MarcasPage.vue')
    },
    {
      path: '/categorias',
      name: 'categorias',
      component: () => import('@/presentation/pages/CategoriasPage.vue')
    },
    {
      path: '/compras',
      name: 'compras',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/compras/nueva',
      name: 'compras-nueva',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/compras/proveedores',
      name: 'compras-proveedores',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/ventas',
      name: 'ventas',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/ventas/lista',
      name: 'ventas-lista',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/ventas/clientes',
      name: 'ventas-clientes',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/caja',
      name: 'caja',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/caja/movimientos',
      name: 'caja-movimientos',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/reportes/ventas',
      name: 'reportes-ventas',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/reportes/inventario',
      name: 'reportes-inventario',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/reportes/productos',
      name: 'reportes-productos',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('@/presentation/pages/PlaceholderPage.vue')
    }
  ]
});

export default router;