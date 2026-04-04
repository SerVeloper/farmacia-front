<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/application/stores/auth.store';
import { useThemeStore } from '@/application/stores/theme.store';
import type { NavigationGroup } from '@/presentation/config/navigation';
import { Icons } from '@/presentation/config/icons';
import { DASHBOARD_ITEM, NAVIGATION_GROUPS } from '@/presentation/config/navigation';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const sidebarOpen = ref(true);
const openGroups = reactive<Record<string, boolean>>({});

const dashboardVisible = computed(() =>
  authStore.canAccess(DASHBOARD_ITEM.permiso.modulo, DASHBOARD_ITEM.permiso.accion),
);

const visibleGroups = computed(() =>
  NAVIGATION_GROUPS.map((group) => {
    const visibleItems = group.items.filter((item) =>
      authStore.canAccess(item.permiso.modulo, item.permiso.accion),
    );

    return {
      ...group,
      items: visibleItems,
    };
  }).filter((group) => group.items.length > 0),
);

const userName = computed(() => authStore.user?.nombre ?? 'Sin sesión');
const userRole = computed(() => authStore.roleLabel);
const userInitials = computed(() => getInitials(userName.value));

function isActive(path: string): boolean {
  return route.path === path;
}

function isGroupActive(group: NavigationGroup): boolean {
  return group.items.some((item) => route.path.startsWith(item.ruta));
}

function isGroupOpen(groupName: string): boolean {
  if (!sidebarOpen.value) {
    return false;
  }

  if (typeof openGroups[groupName] === 'boolean') {
    return openGroups[groupName];
  }

  const group = visibleGroups.value.find((item) => item.nombre === groupName);
  return group ? isGroupActive(group) : false;
}

function getInitials(name: string): string {
  const cleanName = name.trim();
  if (!cleanName) return 'US';

  const words = cleanName.split(' ').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function toggleGroup(groupName: string) {
  if (!sidebarOpen.value) {
    return;
  }

  openGroups[groupName] = !isGroupOpen(groupName);
}

function logout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen flex bg-bg">
    <!-- Sidebar -->
    <aside
      :class="[
        'relative inset-y-0 left-0 z-40 flex flex-col bg-surface border-r border-border transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <!-- Botón de contraer / expandir -->
      <div class="absolute left-full top-6 -translate-x-1/2 z-50">
        <button
          @click="toggleSidebar"
          class="w-8 h-8 flex items-center justify-center rounded-full transition text-white bg-primary hover:opacity-90 shadow-md border-2 border-white"
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

      <!-- Header usuario -->
      <div class="px-4 py-4 border-b border-border shrink-0">
        <div
          :class="[
            'flex items-center',
            sidebarOpen ? 'gap-3' : 'justify-center'
          ]"
        >
          <div
            class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold shrink-0"
          >
            {{ userInitials }}
          </div>

          <div v-if="sidebarOpen" class="overflow-hidden">
            <p class="text-sm font-medium hover:text-primary truncate">
              {{ userName }}
            </p>
            <p class="text-xs text-text-secondary uppercase truncate">
              {{ userRole || 'Sin rol' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
        <RouterLink
          v-if="dashboardVisible"
          :to="DASHBOARD_ITEM.ruta"
          :class="[
            'flex items-center rounded-lg px-3 py-2.5 transition-all duration-200',
            sidebarOpen ? 'gap-3 justify-start' : 'justify-center',
            isActive(DASHBOARD_ITEM.ruta)
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:bg-bg hover:text-primary'
          ]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="DASHBOARD_ITEM.icono" />
          </svg>
          <span v-if="sidebarOpen" class="font-medium text-sm truncate">{{ DASHBOARD_ITEM.nombre }}</span>
        </RouterLink>

        <div v-for="group in visibleGroups" :key="group.nombre" class="space-y-1">
          <button
            type="button"
            class="w-full flex items-center rounded-lg px-3 py-2.5 transition-all duration-200"
            :class="[
              sidebarOpen ? 'gap-3 justify-between' : 'justify-center',
              isGroupActive(group)
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-bg hover:text-primary'
            ]"
            @click="toggleGroup(group.nombre)"
          >
            <span class="flex items-center gap-3 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="group.icono" />
              </svg>
              <span v-if="sidebarOpen" class="font-medium text-sm truncate">{{ group.nombre }}</span>
            </span>

            <svg
              v-if="sidebarOpen"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 shrink-0 transition-transform duration-200"
              :class="isGroupOpen(group.nombre) ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronDown" />
            </svg>
          </button>

          <div v-if="isGroupOpen(group.nombre)" class="ml-3 space-y-1 border-l border-border pl-3">
            <RouterLink
              v-for="item in group.items"
              :key="item.ruta"
              :to="item.ruta"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
               :class="isActive(item.ruta) ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg hover:text-primary'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icono" />
              </svg>
              <span class="truncate">{{ item.nombre }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <!-- Footer -->
      <div class="p-3 border-t border-border space-y-2 shrink-0">
        <!-- Tema -->
        <div
          @click="!sidebarOpen && themeStore.toggleTheme()"
          :class="[
            'flex items-center px-3 py-2 rounded-lg bg-bg transition-all duration-200',
            sidebarOpen ? 'justify-between' : 'justify-center cursor-pointer'
          ]"
        >
          <div class="flex items-center gap-2 min-w-0">
            <svg
              v-if="themeStore.theme === 'light'"
              xmlns="http://www.w3.org/2000/svg"
               class="w-5 h-5 text-text-secondary shrink-0"
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
               class="w-5 h-5 text-text-secondary shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.moon" />
            </svg>

            <span
              v-if="sidebarOpen"
               class="text-sm text-text-secondary truncate"
            >
              {{ themeStore.theme === 'light' ? 'Claro' : 'Oscuro' }}
            </span>
          </div>

          <button
            v-if="sidebarOpen"
            @click.stop="themeStore.toggleTheme()"
            class="relative w-11 h-6 rounded-full bg-primary transition-colors duration-200 focus:outline-none overflow-hidden shrink-0"
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
          @click="logout"
          :class="[
            'flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200',
            sidebarOpen ? 'gap-3 justify-start' : 'justify-center',
            'text-text-secondary hover:bg-bg hover:text-error'
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5 shrink-0"
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

    <!-- Main -->
    <div class="flex-1 flex flex-col min-h-screen">
      <main class="flex-1 p-4 md:p-6 bg-bg">
        <RouterView />
      </main>
    </div>
  </div>
</template>
