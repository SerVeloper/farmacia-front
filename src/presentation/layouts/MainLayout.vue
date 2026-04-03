<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/application/stores/auth.store';
import type { UserRole } from '@/domain/types/user';
import { Icons } from '@/presentation/config/icons';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  roles?: UserRole[];
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const navItems: NavItem[] = [
  { name: 'Inicio', path: '/', icon: Icons.home },
  { name: 'Productos', path: '/productos', icon: Icons.producto },
  { name: 'Marcas', path: '/marcas', icon: Icons.marca },
  { name: 'Categorias', path: '/categorias', icon: Icons.categoria },
  { name: 'Sucursales', path: '/sucursales', icon: Icons.box, roles: ['admin'] },
  { name: 'Usuarios', path: '/usuarios', icon: Icons.user, roles: ['admin'] },
];

const visibleNavItems = computed(() =>
  navItems.filter((item) => !item.roles || authStore.hasRole(item.roles)),
);

const userName = computed(() => authStore.user?.nombre ?? 'Sin sesion');
const userRole = computed(() => authStore.user?.rol ?? '');

function isActive(path: string): boolean {
  return route.path === path;
}

function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function logout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen bg-bg text-text-primary md:grid md:grid-cols-[260px_1fr]">
    <aside class="border-b border-border bg-surface p-4 md:border-b-0 md:border-r md:p-5">
      <div class="flex items-center justify-between gap-3 md:block">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.2em] text-text-secondary">Farmacia</p>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              {{ getInitials(userName) }}
            </div>
            <div>
              <p class="text-sm font-semibold leading-tight">{{ userName }}</p>
              <p class="text-xs uppercase text-text-secondary">{{ userRole }}</p>
            </div>
          </div>
        </div>

        <button
          class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg hover:text-error md:hidden"
          @click="logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.logout" />
          </svg>
          Salir
        </button>
      </div>

      <nav class="mt-4 grid gap-1">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive(item.path)
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-bg hover:text-text-primary',
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.name }}
        </RouterLink>
      </nav>

      <button
        class="mt-6 hidden w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg hover:text-error md:inline-flex"
        @click="logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.logout" />
        </svg>
        Cerrar sesion
      </button>
    </aside>

    <main class="p-4 md:p-6">
      <RouterView />
    </main>
  </div>
</template>
