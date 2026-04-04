<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import { useSucursalStore } from '@/application/stores/sucursal.store';
import { useUserStore } from '@/application/stores/user.store';
import {
  CANONICAL_ROLES,
  getRoleLabel,
  normalizeUserRole,
  type CanonicalUserRole,
} from '@/domain/types/user';

const authStore = useAuthStore();
const sucursalStore = useSucursalStore();
const userStore = useUserStore();

const roles: CanonicalUserRole[] = CANONICAL_ROLES;
const selectedUserId = ref<string | null>(null);
const resetPassword = ref('');

const createForm = reactive({
  nombre: '',
  email: '',
  password: '',
  rol: 'vendedor' as CanonicalUserRole,
  sucursalId: '' as string,
});

const editForm = reactive({
  nombre: '',
  email: '',
  rol: 'vendedor' as CanonicalUserRole,
  sucursalId: '' as string,
  activo: true,
});

const selectedUser = computed(() =>
  userStore.users.find((user) => user.id === selectedUserId.value) || null,
);

const sucursalNombreById = computed(() => {
  return new Map(
    sucursalStore.sucursales.map((sucursal) => [sucursal.id, sucursal.nombre]),
  );
});

onMounted(async () => {
  await Promise.all([userStore.fetchUsers(), sucursalStore.fetchSucursales()]);
});

async function submitCreate() {
  await userStore.createUser({
    ...createForm,
    rolesCodigos: [createForm.rol],
    sucursalId: createForm.sucursalId || null,
  });
  createForm.nombre = '';
  createForm.email = '';
  createForm.password = '';
  createForm.rol = 'vendedor';
  createForm.sucursalId = '';
}

function startEdit(id: string) {
  selectedUserId.value = id;
  const user = userStore.users.find((item) => item.id === id);

  if (!user) {
    return;
  }

  editForm.nombre = user.nombre;
  editForm.email = user.email;
  editForm.rol = normalizeUserRole(user.rol) ?? 'vendedor';
  editForm.sucursalId = user.sucursalId || '';
  editForm.activo = user.activo;
  resetPassword.value = '';
}

function roleLabel(role: string): string {
  return getRoleLabel(role);
}

async function submitEdit() {
  if (!selectedUser.value) {
    return;
  }

  await userStore.updateUser(selectedUser.value.id, {
    nombre: editForm.nombre,
    email: editForm.email,
    rol: editForm.rol,
    rolesCodigos: [editForm.rol],
    sucursalId: editForm.sucursalId || null,
    activo: editForm.activo,
  });
}

async function submitPasswordReset() {
  if (!selectedUser.value || resetPassword.value.length < 6) {
    return;
  }

  await userStore.resetPassword(selectedUser.value.id, resetPassword.value);
  resetPassword.value = '';
}

async function disableUser(id: string) {
  await userStore.disableUser(id);
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold">Usuarios</h1>
      <p class="text-sm text-text-secondary">Gestion de usuarios con roles nuevos y compatibilidad legacy temporal.</p>
    </header>

    <div class="grid gap-4 rounded-2xl border border-border bg-surface p-4 lg:grid-cols-2">
      <div class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">Crear usuario</h2>
        <form class="grid gap-3" @submit.prevent="submitCreate">
          <input v-model="createForm.nombre" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Nombre" required />
          <input v-model="createForm.email" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Email" type="email" required />
          <input v-model="createForm.password" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Contrasena" type="password" minlength="6" required />
          <select v-model="createForm.rol" class="rounded-lg border border-border px-3 py-2 text-sm">
            <option v-for="rol in roles" :key="rol" :value="rol">{{ roleLabel(rol) }}</option>
          </select>
          <select v-model="createForm.sucursalId" class="rounded-lg border border-border px-3 py-2 text-sm">
            <option value="">Sin sucursal</option>
            <option v-for="sucursal in sucursalStore.sucursales" :key="sucursal.id" :value="sucursal.id">
              {{ sucursal.nombre }}
            </option>
          </select>
          <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="userStore.loading">Crear</button>
        </form>
      </div>

      <div class="space-y-3" v-if="selectedUser">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">Editar usuario</h2>
        <form class="grid gap-3" @submit.prevent="submitEdit">
          <input v-model="editForm.nombre" class="rounded-lg border border-border px-3 py-2 text-sm" required />
          <input v-model="editForm.email" class="rounded-lg border border-border px-3 py-2 text-sm" type="email" required />
          <select v-model="editForm.rol" class="rounded-lg border border-border px-3 py-2 text-sm">
            <option v-for="rol in roles" :key="rol" :value="rol">{{ roleLabel(rol) }}</option>
          </select>
          <select v-model="editForm.sucursalId" class="rounded-lg border border-border px-3 py-2 text-sm">
            <option value="">Sin sucursal</option>
            <option v-for="sucursal in sucursalStore.sucursales" :key="sucursal.id" :value="sucursal.id">
              {{ sucursal.nombre }}
            </option>
          </select>
          <label class="flex items-center gap-2 text-sm text-text-secondary">
            <input v-model="editForm.activo" type="checkbox" />
            Activo
          </label>
          <button class="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white" :disabled="userStore.loading">Guardar cambios</button>
        </form>

        <div class="rounded-lg border border-border p-3">
          <p class="text-xs uppercase tracking-wide text-text-secondary">Reset de contrasena</p>
          <div class="mt-2 flex gap-2">
            <input v-model="resetPassword" class="flex-1 rounded-lg border border-border px-3 py-2 text-sm" type="password" minlength="6" placeholder="Nueva contrasena" />
            <button class="rounded-lg border border-border px-3 py-2 text-sm" :disabled="resetPassword.length < 6 || userStore.loading" @click="submitPasswordReset">Reset</button>
          </div>
        </div>
      </div>

      <div class="space-y-3" v-else>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">Editar usuario</h2>
        <p class="text-sm text-text-secondary">Selecciona un usuario de la lista para editarlo.</p>
      </div>
    </div>

    <section class="overflow-hidden rounded-2xl border border-border bg-surface">
      <table class="min-w-full divide-y divide-border text-sm">
        <thead class="bg-bg">
          <tr>
            <th class="px-3 py-2 text-left font-medium">Nombre</th>
            <th class="px-3 py-2 text-left font-medium">Email</th>
            <th class="px-3 py-2 text-left font-medium">Rol</th>
            <th class="px-3 py-2 text-left font-medium">Sucursal</th>
            <th class="px-3 py-2 text-left font-medium">Estado</th>
            <th class="px-3 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="user in userStore.users" :key="user.id" class="hover:bg-bg/70">
            <td class="px-3 py-2">{{ user.nombre }}</td>
            <td class="px-3 py-2">{{ user.email }}</td>
            <td class="px-3 py-2">{{ roleLabel(user.rol) }}</td>
            <td class="px-3 py-2">{{ user.sucursalId ? sucursalNombreById.get(user.sucursalId) || user.sucursalId : '-' }}</td>
            <td class="px-3 py-2">
              <span class="rounded-full px-2 py-1 text-xs" :class="user.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ user.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <div class="inline-flex gap-2">
                <button class="rounded-md border border-border px-2 py-1" @click="startEdit(user.id)">Editar</button>
                <button
                  class="rounded-md border border-border px-2 py-1 text-error"
                  :disabled="user.id === authStore.user?.id || !user.activo"
                  @click="disableUser(user.id)"
                >
                  Desactivar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
