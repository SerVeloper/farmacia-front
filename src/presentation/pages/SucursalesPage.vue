<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { useSucursalStore } from '@/application/stores/sucursal.store';

const sucursalStore = useSucursalStore();

const selectedSucursalId = ref<string | null>(null);

const createForm = reactive({
  codigo: '',
  nombre: '',
  direccion: '',
  telefono: '',
});

const editForm = reactive({
  codigo: '',
  nombre: '',
  direccion: '',
  telefono: '',
  activo: true,
});

const selectedSucursal = computed(
  () =>
    sucursalStore.sucursales.find(
      (sucursal) => sucursal.id === selectedSucursalId.value,
    ) || null,
);

onMounted(async () => {
  await sucursalStore.fetchSucursales();
});

async function submitCreate() {
  await sucursalStore.createSucursal(createForm);
  createForm.codigo = '';
  createForm.nombre = '';
  createForm.direccion = '';
  createForm.telefono = '';
}

function startEdit(id: string) {
  selectedSucursalId.value = id;
  const sucursal = sucursalStore.sucursales.find((item) => item.id === id);

  if (!sucursal) {
    return;
  }

  editForm.codigo = sucursal.codigo;
  editForm.nombre = sucursal.nombre;
  editForm.direccion = sucursal.direccion || '';
  editForm.telefono = sucursal.telefono || '';
  editForm.activo = sucursal.activo;
}

async function submitEdit() {
  if (!selectedSucursal.value) {
    return;
  }

  await sucursalStore.updateSucursal(selectedSucursal.value.id, {
    codigo: editForm.codigo,
    nombre: editForm.nombre,
    direccion: editForm.direccion,
    telefono: editForm.telefono,
    activo: editForm.activo,
  });
}

async function disableSucursal(id: string) {
  await sucursalStore.disableSucursal(id);
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold">Sucursales</h1>
      <p class="text-sm text-text-secondary">Gestion de sucursales desde modulo Configuracion.</p>
    </header>

    <div class="grid gap-4 rounded-2xl border border-border bg-surface p-4 lg:grid-cols-2">
      <div class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">Nueva sucursal</h2>
        <form class="grid gap-3" @submit.prevent="submitCreate">
          <input v-model="createForm.codigo" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Codigo" required />
          <input v-model="createForm.nombre" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Nombre" required />
          <input v-model="createForm.direccion" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Direccion" />
          <input v-model="createForm.telefono" class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Telefono" />
          <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="sucursalStore.loading">Crear</button>
        </form>
      </div>

      <div class="space-y-3" v-if="selectedSucursal">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">Editar sucursal</h2>
        <form class="grid gap-3" @submit.prevent="submitEdit">
          <input v-model="editForm.codigo" class="rounded-lg border border-border px-3 py-2 text-sm" required />
          <input v-model="editForm.nombre" class="rounded-lg border border-border px-3 py-2 text-sm" required />
          <input v-model="editForm.direccion" class="rounded-lg border border-border px-3 py-2 text-sm" />
          <input v-model="editForm.telefono" class="rounded-lg border border-border px-3 py-2 text-sm" />
          <label class="flex items-center gap-2 text-sm text-text-secondary">
            <input v-model="editForm.activo" type="checkbox" />
            Activa
          </label>
          <button class="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white" :disabled="sucursalStore.loading">Guardar cambios</button>
        </form>
      </div>

      <div class="space-y-3" v-else>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">Editar sucursal</h2>
        <p class="text-sm text-text-secondary">Selecciona una sucursal de la lista para editarla.</p>
      </div>
    </div>

    <section class="overflow-hidden rounded-2xl border border-border bg-surface">
      <table class="min-w-full divide-y divide-border text-sm">
        <thead class="bg-bg">
          <tr>
            <th class="px-3 py-2 text-left font-medium">Codigo</th>
            <th class="px-3 py-2 text-left font-medium">Nombre</th>
            <th class="px-3 py-2 text-left font-medium">Telefono</th>
            <th class="px-3 py-2 text-left font-medium">Estado</th>
            <th class="px-3 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="sucursal in sucursalStore.sucursales" :key="sucursal.id" class="hover:bg-bg/70">
            <td class="px-3 py-2">{{ sucursal.codigo }}</td>
            <td class="px-3 py-2">{{ sucursal.nombre }}</td>
            <td class="px-3 py-2">{{ sucursal.telefono || '-' }}</td>
            <td class="px-3 py-2">
              <span class="rounded-full px-2 py-1 text-xs" :class="sucursal.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ sucursal.activo ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">
              <div class="inline-flex gap-2">
                <button class="rounded-md border border-border px-2 py-1" @click="startEdit(sucursal.id)">Editar</button>
                <button
                  class="rounded-md border border-border px-2 py-1 text-error"
                  :disabled="!sucursal.activo"
                  @click="disableSucursal(sucursal.id)"
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
