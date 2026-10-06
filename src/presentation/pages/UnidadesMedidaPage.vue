<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useUnidadMedidaStore } from '@/application/stores/unidad-medida.store';
import type {
  CreateUnidadMedidaDto,
  UnidadMedida,
  UpdateUnidadMedidaDto,
} from '@/domain/types/unidad-medida';
import Modal from '@/presentation/components/common/Modal.vue';
import Spinner from '@/presentation/components/common/Spinner.vue';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

const unidadStore = useUnidadMedidaStore();

const modalOpen = ref(false);
const esEdicion = ref(false);
const loadingSubmit = ref(false);
const unidadIdEditando = ref<string | null>(null);

const form = ref<CreateUnidadMedidaDto>({
  nombre: '',
  abreviatura: '',
  descripcion: '',
});

// Límite de página de este listado admin (patrón ProductosPage).
const PAGE_SIZE = 10;

// Mismo patrón que ProductosPage: expone la paginación del store a la plantilla.
const pagination = computed(() => unidadStore.pagination);

onMounted(() => {
  // Página admin: SIEMPRE con args de paginación para que el listado quede
  // paginado; `true` conserva el histórico de inactivos propio de esta página.
  unidadStore.fetchUnidades(true, 1, PAGE_SIZE);
});

function abrirModalCrear() {
  esEdicion.value = false;
  unidadIdEditando.value = null;
  form.value = {
    nombre: '',
    abreviatura: '',
    descripcion: '',
  };
  modalOpen.value = true;
}

function abrirModalEditar(unidad: UnidadMedida) {
  esEdicion.value = true;
  unidadIdEditando.value = unidad.id;
  form.value = {
    nombre: unidad.nombre,
    abreviatura: unidad.abreviatura,
    descripcion: unidad.descripcion || '',
  };
  modalOpen.value = true;
}

async function handleSubmit() {
  loadingSubmit.value = true;
  try {
    if (esEdicion.value && unidadIdEditando.value) {
      const updateDto: UpdateUnidadMedidaDto = {
        nombre: form.value.nombre,
        abreviatura: form.value.abreviatura,
        descripcion: form.value.descripcion,
      };
      await unidadStore.updateUnidad(unidadIdEditando.value, updateDto);
    } else {
      await unidadStore.createUnidad(form.value);
    }
    modalOpen.value = false;
    // Refresca la página visible para que total/resumen queden exactos.
    await unidadStore.fetchUnidades(true, pagination.value.page, pagination.value.limit);
  } catch {
    // El store ya emite toast.error y relanza el error. Aquí SOLO se contiene
    // la promesa rechazada para evitar unhandled rejection en el event handler
    // de Vue. El modal permanece abierto con los valores intactos.
  } finally {
    loadingSubmit.value = false;
  }
}

async function toggleActivo(unidad: UnidadMedida) {
  try {
    await unidadStore.updateUnidad(unidad.id, { activo: !unidad.activo });
  } catch {
    // El store ya emite toast.error y relanza. Solo se contiene la rechazada
    // para evitar unhandled rejection en el event handler de Vue; la fila
    // conserva su estado porque la mutación fallida no se aplicó.
  }
}

function cambioPagina(nuevaPagina: number) {
  unidadStore.fetchUnidades(true, nuevaPagina, pagination.value.limit);
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Unidades de medida</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">Gestiona unidades para productos y compras.</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-white transition-all duration-200 hover:bg-[var(--color-primary-hover)]"
        @click="abrirModalCrear"
      >
        Nueva unidad
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Abreviatura</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Descripcion</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="unidadStore.loading">
              <td colspan="5" class="px-4 py-6">
                <TableSkeleton :columns="5" :rows="5" />
              </td>
            </tr>
            <tr v-else-if="unidadStore.error" class="text-center">
              <td colspan="5" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ unidadStore.error }}</p>
                  <p class="text-xs text-[var(--color-text-secondary)]">No se pudieron cargar las unidades de medida. Verificá la conexión con el servidor e intentá nuevamente.</p>
                  <button
                    class="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                    @click="unidadStore.fetchUnidades(true, pagination.page, pagination.limit)"
                  >
                    Reintentar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-else-if="unidadStore.unidades.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                No hay unidades registradas.
              </td>
            </tr>
            <tr v-for="unidad in unidadStore.unidades" :key="unidad.id" class="hover:bg-[var(--color-bg)]">
              <td class="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{{ unidad.nombre }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ unidad.abreviatura }}</td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{{ unidad.descripcion || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <span :class="[
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  unidad.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                ]">
                  {{ unidad.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button class="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs" @click="abrirModalEditar(unidad)">
                    Editar
                  </button>
                  <button class="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs" @click="toggleActivo(unidad)">
                    {{ unidad.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination: el resumen SIEMPRE es visible; los botones solo cuando hay más de una página -->
      <div class="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
        <p class="text-sm text-[var(--color-text-secondary)]">
          Mostrando {{ (pagination.page - 1) * pagination.limit + 1 }} - {{ Math.min(pagination.page * pagination.limit, pagination.total) }} de {{ pagination.total }}
        </p>
        <div v-if="pagination.totalPages > 1" class="flex gap-1">
          <button
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="pagination.page <= 1"
            @click="cambioPagina(pagination.page - 1)"
          >
            Anterior
          </button>
          <button
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="pagination.page >= pagination.totalPages"
            @click="cambioPagina(pagination.page + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>

    <Modal
      :open="modalOpen"
      :title="esEdicion ? 'Editar unidad de medida' : 'Nueva unidad de medida'"
      size="md"
      @close="modalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="form.nombre"
            type="text"
            required
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-[var(--color-text-primary)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Abreviatura <span class="text-red-500">*</span></label>
          <input
            v-model="form.abreviatura"
            type="text"
            required
            class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-[var(--color-text-primary)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Descripcion</label>
          <textarea
            v-model="form.descripcion"
            rows="3"
            class="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-[var(--color-text-primary)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-primary)]"
            @click="modalOpen = false"
          >
            Cancelar
          </button>
          <button
            class="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2 text-white disabled:opacity-60"
            :disabled="loadingSubmit"
            @click="handleSubmit"
          >
            <Spinner v-if="loadingSubmit" size="sm" />
            {{ esEdicion ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>
