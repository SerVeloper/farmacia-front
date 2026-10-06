<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useMarcaStore } from '@/application/stores/marca.store';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@/domain/types/marca';
import Modal from '@/presentation/components/common/Modal.vue';
import ConfirmDialog from '@/presentation/components/common/ConfirmDialog.vue';
import Spinner from '@/presentation/components/common/Spinner.vue';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

const marcaStore = useMarcaStore();

const modalOpen = ref(false);
const confirmOpen = ref(false);
const marcaAEliminar = ref<string | null>(null);
const esEdicion = ref(false);
const loadingSubmit = ref(false);

const searchQuery = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

const form = ref<CreateMarcaDto>({
  nombre: '',
  descripcion: ''
});

const marcaIdEditando = ref<string | null>(null);

// Límite de página de este listado admin (patrón ProductosPage).
const PAGE_SIZE = 10;

// Mismo patrón que ProductosPage: expone la paginación del store a la plantilla.
const pagination = computed(() => marcaStore.pagination);

onMounted(() => {
  // Página admin: SIEMPRE con args para que el listado quede paginado.
  marcaStore.fetchMarcas(1, PAGE_SIZE);
});

watch(searchQuery, (newQuery) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (newQuery.trim()) {
      marcaStore.marcas = marcaStore.marcas.filter(m => 
        m.nombre.toLowerCase().includes(newQuery.toLowerCase()) ||
        (m.descripcion && m.descripcion.toLowerCase().includes(newQuery.toLowerCase()))
      );
    } else {
      marcaStore.fetchMarcas(1, PAGE_SIZE);
    }
  }, 300);
});

function abrirModalCrear() {
  esEdicion.value = false;
  marcaIdEditando.value = null;
  form.value = { nombre: '', descripcion: '' };
  modalOpen.value = true;
}

function abrirModalEditar(marca: Marca) {
  esEdicion.value = true;
  marcaIdEditando.value = marca.id;
  form.value = {
    nombre: marca.nombre,
    descripcion: marca.descripcion || ''
  };
  modalOpen.value = true;
}

async function handleSubmit() {
  loadingSubmit.value = true;
  try {
    if (esEdicion.value && marcaIdEditando.value) {
      await marcaStore.actualizarMarca(marcaIdEditando.value, form.value as UpdateMarcaDto);
    } else {
      await marcaStore.crearMarca(form.value);
    }
    modalOpen.value = false;
    // Refresca la página visible para que total/resumen queden exactos.
    await marcaStore.fetchMarcas(pagination.value.page, pagination.value.limit);
  } catch {
    // El store ya emite toast.error y relanza el error. Aquí SOLO se contiene
    // la promesa rechazada para evitar unhandled rejection en el event handler
    // de Vue. El modal permanece abierto con los valores intactos.
  } finally {
    loadingSubmit.value = false;
  }
}

function confirmarEliminar(id: string) {
  marcaAEliminar.value = id;
  confirmOpen.value = true;
}

async function handleEliminar() {
  if (marcaAEliminar.value) {
    try {
      await marcaStore.eliminarMarca(marcaAEliminar.value);
      confirmOpen.value = false;
      marcaAEliminar.value = null;
      // Refresca la página visible para que total/resumen queden exactos.
      await marcaStore.fetchMarcas(pagination.value.page, pagination.value.limit);
    } catch {
      // El store ya emite toast.error y relanza. El diálogo permanece abierto.
      // Solo se contiene la rechazada para evitar unhandled rejection.
    }
  }
}

function cambioPagina(nuevaPagina: number) {
  marcaStore.fetchMarcas(nuevaPagina, pagination.value.limit);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Marcas</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">Gestiona las marcas de productos</p>
      </div>
      <button
        @click="abrirModalCrear"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva Marca
      </button>
    </div>

    <!-- Search -->
    <div class="relative max-w-md">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar marcas..."
        class="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
      />
    </div>

    <!-- Table -->
    <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Descripción</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="marcaStore.loading" class="text-center">
              <td colspan="4" class="px-4 py-8">
                <TableSkeleton :columns="4" :rows="5" />
              </td>
            </tr>
            <tr v-else-if="marcaStore.error" class="text-center">
              <td colspan="4" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ marcaStore.error }}</p>
                  <p class="text-xs text-[var(--color-text-secondary)]">No se pudieron cargar las marcas. Verificá la conexión con el servidor e intentá nuevamente.</p>
                  <button
                    @click="marcaStore.fetchMarcas(pagination.page, pagination.limit)"
                    class="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-else-if="marcaStore.marcas.length === 0" class="text-center">
              <td colspan="4" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-[var(--color-text-secondary)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p class="text-[var(--color-text-secondary)]">No hay marcas registradas</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="marca in marcaStore.marcas"
              :key="marca.id"
              class="hover:bg-[var(--color-bg)] transition-colors duration-150"
            >
              <td class="px-4 py-3">
                <span class="font-medium text-[var(--color-text-primary)]">{{ marca.nombre }}</span>
              </td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)] max-w-xs truncate">
                {{ marca.descripcion || '-' }}
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="[
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  marca.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                ]">
                  {{ marca.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="abrirModalEditar(marca)"
                    class="p-2 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="confirmarEliminar(marca.id)"
                    class="p-2 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination: el resumen SIEMPRE es visible; los botones solo cuando hay más de una página -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
        <p class="text-sm text-[var(--color-text-secondary)]">
          Mostrando {{ (pagination.page - 1) * pagination.limit + 1 }} - {{ Math.min(pagination.page * pagination.limit, pagination.total) }} de {{ pagination.total }}
        </p>
        <div v-if="pagination.totalPages > 1" class="flex gap-1">
          <button
            @click="cambioPagina(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] transition-colors"
          >
            Anterior
          </button>
          <button
            @click="cambioPagina(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal :open="modalOpen" :title="esEdicion ? 'Editar Marca' : 'Nueva Marca'" size="md" @close="modalOpen = false">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="form.nombre"
            type="text"
            required
            placeholder="Ej: Bayer"
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Descripción</label>
          <textarea
            v-model="form.descripcion"
            rows="3"
            placeholder="Descripción opcional de la marca..."
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all resize-none"
          ></textarea>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="modalOpen = false"
            class="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            @click="handleSubmit"
            :disabled="loadingSubmit"
            class="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <Spinner v-if="loadingSubmit" size="sm" />
            {{ esEdicion ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Confirm Delete -->
    <ConfirmDialog
      :open="confirmOpen"
      title="Eliminar Marca"
      message="¿Estás seguro de que deseas eliminar esta marca? Los productos asociados perderán esta marca."
      confirm-text="Eliminar"
      type="danger"
      @confirm="handleEliminar"
      @cancel="confirmOpen = false"
    />
  </div>
</template>