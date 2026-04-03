<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useThemeStore } from '@/application/stores/theme.store';
import { Icons } from '@/presentation/config/icons';

const route = useRoute();
const sidebarOpen = ref(true);
const themeStore = useThemeStore();

const user = {
  nombre: 'Sergio Navarro',
  iniciales: 'SN'
};

const menuItems = [
  { name: 'Inicio', path: '/', icon: Icons.home }
];

const inventarioItems = [
  { name: 'Productos', path: '/productos', icon: Icons.producto },
  { name: 'Categorías', path: '/categorias', icon: Icons.categoria },
  { name: 'Marcas', path: '/marcas', icon: Icons.marca }
];

const comprasItems = [
  { name: 'Lista de Compras', path: '/compras', icon: Icons.box },
  { name: 'Nueva Compra', path: '/compras/nueva', icon: Icons.plus },
  { name: 'Proveedores', path: '/compras/proveedores', icon: Icons.user }
];

const ventasItems = [
  { name: 'Punto de Venta', path: '/ventas', icon: Icons.sales },
  { name: 'Lista de Ventas', path: '/ventas/lista', icon: Icons.box },
  { name: 'Clientes', path: '/ventas/clientes', icon: Icons.user }
];

const cajaItems = [
  { name: 'Apertura/Cierre', path: '/caja', icon: Icons.box },
  { name: 'Movimientos', path: '/caja/movimientos', icon: Icons.report }
];

const reportesItems = [
  { name: 'Ventas', path: '/reportes/ventas', icon: Icons.sales },
  { name: 'Inventario', path: '/reportes/inventario', icon: Icons.box },
  { name: 'Productos Más Vendidos', path: '/reportes/productos', icon: Icons.producto }
];

const otrosMenus = [
  { name: 'Configuración', path: '/configuracion', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
];

const expandedMenus = ref<Set<string>>(new Set());
const hoveredMenu = ref<string | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });

onMounted(() => {
  expandedMenus.value.clear();
});

function isActive(path: string): boolean {
  return route.path === path;
}

function toggleMenu(menu: string) {
  if (expandedMenus.value.has(menu)) {
    expandedMenus.value.delete(menu);
  } else {
    expandedMenus.value.add(menu);
  }
}

function isExpanded(menu: string): boolean {
  return expandedMenus.value.has(menu);
}

function handleMouseEnter(menu: string, event: MouseEvent) {
  if (!sidebarOpen.value) {
    hoveredMenu.value = menu;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    hoverPosition.value = { x: rect.right, y: rect.top };
  }
}

function handleMouseLeave() {
  hoveredMenu.value = null;
}

function handleLogout() {
  alert('Cerrar sesión (pendiente de implementación)');
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  if (sidebarOpen.value) {
    hoveredMenu.value = null;
  }
}
</script>

<template>
  <div class="min-h-screen flex relative">
    <!-- Sidebar -->
    <aside 
      :class="[
        'relative inset-y-0 left-0 z-40 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <!-- Toggle Button - posicionado en el borde del navbar -->
      <div class="absolute left-full top-5 -translate-x-1/2 z-50">
        <button
          @click="toggleSidebar"
          class="w-8 h-8 flex items-center justify-center rounded-full transition text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-md border-2 border-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 transition-transform duration-300"
            :class="sidebarOpen ? 'rotate-180' : 'rotate-0'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronRight" />
          </svg>
        </button>
      </div>

      <!-- Header Usuario -->
      <div class="px-4 py-4 border-b border-[var(--color-border)] flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold flex-shrink-0">
            {{ user.iniciales }}
          </div>
          <div v-if="sidebarOpen" class="overflow-hidden">
            <p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{{ user.nombre }}</p>
            <p class="text-xs text-[var(--color-text-secondary)]">Administrador</p>
          </div>
        </div>
      </div>

      <!-- Navigation con scroll -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
        <!-- Home -->
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            isActive(item.path) 
              ? 'bg-[var(--color-primary)] text-white' 
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span v-if="sidebarOpen" class="font-medium">{{ item.name }}</span>
        </RouterLink>

        <!-- Inventario -->
        <div class="pt-2">
          <div 
            @click="toggleMenu('inventario')"
            @mouseenter="(e) => handleMouseEnter('inventario', e)"
            @mouseleave="handleMouseLeave"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.box" />
            </svg>
            <div v-if="sidebarOpen" class="flex-1 flex items-center justify-between">
              <span class="font-medium">Inventario</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform" :class="isExpanded('inventario') ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronRight" />
              </svg>
            </div>
          </div>
          <!-- Submenu expanded -->
          <div v-if="sidebarOpen && isExpanded('inventario')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in inventarioItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-2',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
          <!-- Floating submenu on hover when collapsed -->
          <div 
            v-if="!sidebarOpen && hoveredMenu === 'inventario'"
            class="fixed z-50 mt-1 py-1 w-48 rounded-lg shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            :style="{ left: hoverPosition.x + 'px', top: hoverPosition.y + 'px' }"
          >
            <RouterLink
              v-for="item in inventarioItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- Compras -->
        <div class="pt-2">
          <div 
            @click="toggleMenu('compras')"
            @mouseenter="(e) => handleMouseEnter('compras', e)"
            @mouseleave="handleMouseLeave"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.box" />
            </svg>
            <div v-if="sidebarOpen" class="flex-1 flex items-center justify-between">
              <span class="font-medium">Compras</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform" :class="isExpanded('compras') ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronRight" />
              </svg>
            </div>
          </div>
          <div v-if="sidebarOpen && isExpanded('compras')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in comprasItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-2',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
          <div 
            v-if="!sidebarOpen && hoveredMenu === 'compras'"
            class="fixed z-50 mt-1 py-1 w-48 rounded-lg shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            :style="{ left: hoverPosition.x + 'px', top: hoverPosition.y + 'px' }"
          >
            <RouterLink
              v-for="item in comprasItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- Ventas -->
        <div class="pt-2">
          <div 
            @click="toggleMenu('ventas')"
            @mouseenter="(e) => handleMouseEnter('ventas', e)"
            @mouseleave="handleMouseLeave"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.sales" />
            </svg>
            <div v-if="sidebarOpen" class="flex-1 flex items-center justify-between">
              <span class="font-medium">Ventas</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform" :class="isExpanded('ventas') ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronRight" />
              </svg>
            </div>
          </div>
          <div v-if="sidebarOpen && isExpanded('ventas')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in ventasItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-2',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
          <div 
            v-if="!sidebarOpen && hoveredMenu === 'ventas'"
            class="fixed z-50 mt-1 py-1 w-48 rounded-lg shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            :style="{ left: hoverPosition.x + 'px', top: hoverPosition.y + 'px' }"
          >
            <RouterLink
              v-for="item in ventasItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- Caja -->
        <div class="pt-2">
          <div 
            @click="toggleMenu('caja')"
            @mouseenter="(e) => handleMouseEnter('caja', e)"
            @mouseleave="handleMouseLeave"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m2 0h1m7 0h1M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
            <div v-if="sidebarOpen" class="flex-1 flex items-center justify-between">
              <span class="font-medium">Caja</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform" :class="isExpanded('caja') ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronRight" />
              </svg>
            </div>
          </div>
          <div v-if="sidebarOpen && isExpanded('caja')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in cajaItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-2',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
          <div 
            v-if="!sidebarOpen && hoveredMenu === 'caja'"
            class="fixed z-50 mt-1 py-1 w-48 rounded-lg shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            :style="{ left: hoverPosition.x + 'px', top: hoverPosition.y + 'px' }"
          >
            <RouterLink
              v-for="item in cajaItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- Reportes -->
        <div class="pt-2">
          <div 
            @click="toggleMenu('reportes')"
            @mouseenter="(e) => handleMouseEnter('reportes', e)"
            @mouseleave="handleMouseLeave"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.report" />
            </svg>
            <div v-if="sidebarOpen" class="flex-1 flex items-center justify-between">
              <span class="font-medium">Reportes</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform" :class="isExpanded('reportes') ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronRight" />
              </svg>
            </div>
          </div>
          <div v-if="sidebarOpen && isExpanded('reportes')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in reportesItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ml-2',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
          <div 
            v-if="!sidebarOpen && hoveredMenu === 'reportes'"
            class="fixed z-50 mt-1 py-1 w-48 rounded-lg shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            :style="{ left: hoverPosition.x + 'px', top: hoverPosition.y + 'px' }"
          >
            <RouterLink
              v-for="item in reportesItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                isActive(item.path) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
              ]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-sm">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- Configuración -->
        <div class="pt-2">
          <RouterLink
            v-for="menu in otrosMenus"
            :key="menu.path"
            :to="menu.path"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              isActive(menu.path) 
                ? 'bg-[var(--color-primary)] text-white' 
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="menu.icon" />
            </svg>
            <span v-if="sidebarOpen" class="font-medium">{{ menu.name }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- Footer: Theme Switch + Logout -->
      <div class="p-3 border-t border-[var(--color-border)] space-y-2 flex-shrink-0">
        <!-- Theme Switch -->
        <div
          @click="!sidebarOpen && themeStore.toggleTheme()"
          :class="[
            'flex items-center px-3 py-2 rounded-lg bg-[var(--color-bg)] transition-all duration-200',
            sidebarOpen ? 'justify-between' : 'justify-center cursor-pointer'
          ]"
        >
          <div class="flex items-center gap-2 min-w-0">
            <svg
              v-if="themeStore.theme === 'light'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.sun" />
            </svg>

            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.moon" />
            </svg>

            <span
              v-if="sidebarOpen"
              class="text-sm text-[var(--color-text-secondary)] truncate"
            >
              {{ themeStore.theme === 'light' ? 'Claro' : 'Oscuro' }}
            </span>
          </div>

          <button
            v-if="sidebarOpen"
            @click.stop="themeStore.toggleTheme()"
            class="relative w-11 h-6 rounded-full bg-[var(--color-primary)] transition-colors duration-200 focus:outline-none overflow-hidden flex-shrink-0"
          >
            <span
              :class="[
                'absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200',
                themeStore.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              ]"
            ></span>
          </button>
        </div>

        <!-- Logout -->
        <button
          @click="handleLogout"
          :class="[
            'flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200',
            sidebarOpen ? 'gap-3 justify-start' : 'justify-center',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-error)]'
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.logout" />
          </svg>
          <span v-if="sidebarOpen" class="text-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-h-screen">
      <main class="flex-1 p-6 bg-[var(--color-bg)]">
        <RouterView />
      </main>
    </div>
  </div>
</template>