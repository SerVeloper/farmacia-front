<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useServicioStore } from '@/application/stores/servicio.store';
import type { Servicio, CreateServicioDto } from '@/domain/types/servicio';
import Modal from '@/presentation/components/common/Modal.vue';
import Spinner from '@/presentation/components/common/Spinner.vue';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';

const servicioStore = useServicioStore();

const modalOpen = ref(false);
const esEdicion = ref(false);
const loadingSubmit = ref(false);
const formError = ref('');
const estadoCambiandoId = ref<string | null>(null);

const searchQuery = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

const form = ref<CreateServicioDto>({
  nombre: '',
  descripcion: '',
  precioVenta: 0,
  activo: true,
});

const servicioIdEditando = ref<string | null>(null);

// Límite de página de este listado admin (patrón CategoriasPage/ProductosPage).
const PAGE_SIZE = 10;

// Mismo patrón que CategoriasPage: expone la paginación del store a la plantilla.
const pagination = computed(() => servicioStore.pagination);

onMounted(() => {
  // Página admin: SIEMPRE con args para que el listado quede paginado.
  servicioStore.fetchServicios(1, PAGE_SIZE);
});

watch(searchQuery, (newQuery) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (newQuery.trim()) {
      servicioStore.servicios = servicioStore.servicios.filter(s =>
        s.nombre.toLowerCase().includes(newQuery.toLowerCase()) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(newQuery.toLowerCase()))
      );
    } else {
      servicioStore.fetchServicios(1, PAGE_SIZE);
    }
  }, 300);
});

/**
 * Prioriza el mensaje del backend (ya viene en español desde la API) y
 * normaliza el caso class-validator, que responde `message` como array.
 */
function mensajeBackend(e: unknown, fallback: string): string {
  const raw = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(raw) && raw.length > 0) return raw.join(' · ');
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
}

// El backend puede devolver numeric como string: se formatea vía Number()
// para no romper .toFixed en runtime.
function formatPrecio(valor: number): string {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function abrirModalCrear() {
  esEdicion.value = false;
  servicioIdEditando.value = null;
  formError.value = '';
  form.value = { nombre: '', descripcion: '', precioVenta: 0, activo: true };
  modalOpen.value = true;
}

function abrirModalEditar(servicio: Servicio) {
  esEdicion.value = true;
  servicioIdEditando.value = servicio.id;
  formError.value = '';
  form.value = {
    nombre: servicio.nombre,
    descripcion: servicio.descripcion || '',
    precioVenta: Number(servicio.precioVenta),
    activo: servicio.activo,
  };
  modalOpen.value = true;
}

async function handleSubmit() {
  formError.value = '';
  const precio = Number(form.value.precioVenta);

  if (!form.value.nombre.trim()) {
    formError.value = 'El nombre del servicio es obligatorio.';
    return;
  }
  if (!Number.isFinite(precio) || precio < 0) {
    formError.value = 'El precio de venta debe ser un número mayor o igual a 0.';
    return;
  }

  loadingSubmit.value = true;
  try {
    const payload: CreateServicioDto = {
      nombre: form.value.nombre.trim(),
      descripcion: form.value.descripcion?.trim() || undefined,
      precioVenta: precio,
      activo: form.value.activo ?? true,
    };

    if (esEdicion.value && servicioIdEditando.value) {
      await servicioStore.actualizarServicio(servicioIdEditando.value, payload);
    } else {
      await servicioStore.crearServicio(payload);
    }
    modalOpen.value = false;
    // Refresca la página visible para que total/resumen queden exactos.
    await servicioStore.fetchServicios(pagination.value.page, pagination.value.limit);
  } catch (e: unknown) {
    // El store ya emite toast.error (prioriza el mensaje del backend) y
    // relanza el error. Aquí SOLO se contiene la promesa rechazada para
    // evitar unhandled rejection en el event handler de Vue, y se muestra
    // ese mismo mensaje dentro del modal. Permanece abierto con los valores.
    formError.value = mensajeBackend(
      e,
      'No se pudo guardar el servicio. Verificá los datos e intentá nuevamente.'
    );
  } finally {
    loadingSubmit.value = false;
  }
}

/**
 * Soft-delete vía `activo` (la API no expone DELETE). La operación es
 * reversible, así que no requiere ConfirmDialog como el borrado físico.
 */
async function toggleActivo(servicio: Servicio) {
  if (estadoCambiandoId.value) return;
  estadoCambiandoId.value = servicio.id;
  try {
    await servicioStore.cambiarEstadoServicio(servicio.id, !servicio.activo);
    // Refresca la página visible para que total/resumen queden exactos.
    await servicioStore.fetchServicios(pagination.value.page, pagination.value.limit);
  } catch {
    // El store ya emite toast.error (con el mensaje del backend si existe)
    // y relanza. Solo se contiene la rechazada para evitar unhandled rejection.
  } finally {
    estadoCambiandoId.value = null;
  }
}

function cambioPagina(nuevaPagina: number) {
  servicioStore.fetchServicios(nuevaPagina, pagination.value.limit);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Servicios</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">Gestiona los servicios que ofrece la farmacia (ej. aplicaciones de inyectables)</p>
      </div>
      <button
        @click="abrirModalCrear"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Servicio
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
        placeholder="Buscar servicios..."
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
              <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Precio venta</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="servicioStore.loading" class="text-center">
              <td colspan="5" class="px-4 py-8">
                <TableSkeleton :columns="5" :rows="5" />
              </td>
            </tr>
            <tr v-else-if="servicioStore.error" class="text-center">
              <td colspan="5" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ servicioStore.error }}</p>
                  <p class="text-xs text-[var(--color-text-secondary)]">No se pudieron cargar los servicios. Verificá la conexión con el servidor e intentá nuevamente.</p>
                  <button
                    @click="servicioStore.fetchServicios(pagination.page, pagination.limit)"
                    class="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-else-if="servicioStore.servicios.length === 0" class="text-center">
              <td colspan="5" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-[var(--color-text-secondary)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <p class="text-[var(--color-text-secondary)]">No hay servicios registrados</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="servicio in servicioStore.servicios"
              :key="servicio.id"
              class="hover:bg-[var(--color-bg)] transition-colors duration-150"
            >
              <td class="px-4 py-3">
                <span class="font-medium text-[var(--color-text-primary)]">{{ servicio.nombre }}</span>
              </td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)] max-w-xs truncate">
                {{ servicio.descripcion || '-' }}
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-[var(--color-text-primary)]">{{ formatPrecio(servicio.precioVenta) }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="toggleActivo(servicio)"
                    :disabled="estadoCambiandoId === servicio.id"
                    role="switch"
                    :aria-checked="servicio.activo"
                    :aria-label="servicio.activo ? `Desactivar ${servicio.nombre}` : `Activar ${servicio.nombre}`"
                    :title="servicio.activo ? 'Desactivar servicio (baja lógica)' : 'Activar servicio'"
                    class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="servicio.activo ? 'bg-emerald-500' : 'bg-red-400'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                      :class="servicio.activo ? 'translate-x-5' : 'translate-x-0.5'"
                    />
                  </button>
                  <span
                    :class="[
                      'text-xs font-medium',
                      servicio.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    ]"
                  >
                    {{ servicio.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="abrirModalEditar(servicio)"
                    class="p-2 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
    <Modal :open="modalOpen" :title="esEdicion ? 'Editar Servicio' : 'Nuevo Servicio'" size="md" @close="modalOpen = false">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div
          v-if="formError"
          class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3.5 py-2.5"
          role="alert"
        >
          <p class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="form.nombre"
            type="text"
            required
            placeholder="Ej: Aplicación de Inyectable"
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Descripción</label>
          <textarea
            v-model="form.descripcion"
            rows="3"
            placeholder="Descripción opcional del servicio..."
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all resize-none"
          ></textarea>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Precio de venta <span class="text-red-500">*</span></label>
          <input
            v-model.number="form.precioVenta"
            type="number"
            step="0.01"
            min="0"
            required
            inputmode="decimal"
            placeholder="0.00"
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
          <p class="text-xs text-[var(--color-text-secondary)]">Sin costo ni margen: un servicio solo tiene precio de venta.</p>
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Servicio activo</label>
            <p class="text-xs text-[var(--color-text-secondary)]">Los servicios inactivos no se listan en el POS.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.activo !== false"
            @click="form.activo = form.activo === false"
            class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]"
            :class="form.activo !== false ? 'bg-emerald-500' : 'bg-red-400'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
              :class="form.activo !== false ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
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
  </div>
</template>
