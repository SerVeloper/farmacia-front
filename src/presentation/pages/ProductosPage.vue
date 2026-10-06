<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProductoStore } from '@/application/stores/producto.store';
import { useCategoriaStore } from '@/application/stores/categoria.store';
import { useMarcaStore } from '@/application/stores/marca.store';
import { useUnidadMedidaStore } from '@/application/stores/unidad-medida.store';
import { leerEsMedicamento, type Producto, type CreateProductoDto, type UpdateProductoDto } from '@/domain/types/producto';
import Modal from '@/presentation/components/common/Modal.vue';
import ConfirmDialog from '@/presentation/components/common/ConfirmDialog.vue';
import Spinner from '@/presentation/components/common/Spinner.vue';
import TableSkeleton from '@/presentation/components/common/TableSkeleton.vue';
import { Icons } from '@/presentation/config/icons';

const productoStore = useProductoStore();
const categoriaStore = useCategoriaStore();
const marcaStore = useMarcaStore();
const unidadMedidaStore = useUnidadMedidaStore();

const modalOpen = ref(false);
const confirmOpen = ref(false);
const productoAEliminar = ref<string | null>(null);
const esEdicion = ref(false);
const loadingSubmit = ref(false);
const loadingSelects = ref(false);

// Modales rápidos de creación
const modalCategoriaOpen = ref(false);
const modalMarcaOpen = ref(false);
const loadingQuickSubmit = ref(false);

const quickForm = ref({
  nombre: '',
  descripcion: ''
});

const searchQuery = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

/**
 * R1: el formulario trabaja con un triestado (`null` = sin decidir) porque
 * `CreateProductoDto.esMedicamento` es booleano REQUERIDO. El `null` vive solo
 * en la vista; nunca sale en el payload.
 */
type ProductoFormModel = Omit<CreateProductoDto, 'esMedicamento'> & {
  esMedicamento: boolean | null;
};

function crearFormularioVacio(): ProductoFormModel {
  return {
    nombre: '',
    categoriaId: undefined,
    marcaId: undefined,
    principioActivo: '',
    unidad: 'pieza',
    precioCompra: 0,
    precioVenta: 0,
    margen: 20,
    stockMinimo: 0,
    stockMaximo: 0,
    esControlado: false,
    esMedicamento: null,
    descripcion: ''
  };
}

const form = ref<ProductoFormModel>(crearFormularioVacio());
const errorClasificacion = ref('');

const productoIdEditando = ref<string | null>(null);

onMounted(() => {
  productoStore.fetchProductos();
});

watch(searchQuery, (newQuery) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (newQuery.trim()) {
      productoStore.buscarProductos(newQuery);
    } else {
      productoStore.fetchProductos();
    }
  }, 400);
});

async function loadSelects() {
  loadingSelects.value = true;
  await Promise.all([
    categoriaStore.fetchCategorias(),
    marcaStore.fetchMarcas(),
    unidadMedidaStore.fetchUnidades(),
  ]);
  loadingSelects.value = false;
}

function abrirModalCrear() {
  esEdicion.value = false;
  productoIdEditando.value = null;
  errorClasificacion.value = '';
  // R1.1: alta siempre arranca sin seleccion.
  form.value = crearFormularioVacio();
  loadSelects();
  modalOpen.value = true;
}

function abrirModalEditar(producto: Producto) {
  esEdicion.value = true;
  productoIdEditando.value = producto.id;
  errorClasificacion.value = '';
  // R1.5: se carga el valor vigente y NO se resetea. Si la API omite el campo,
  // `leerEsMedicamento` devuelve `null` (clasificacion DESCONOCIDA): la UI no
  // inventa un `false` por defecto, deja el control sin marcar y omite el campo
  // del payload para que el backend preserve lo almacenado (R1.5).
  form.value = {
    nombre: producto.nombre,
    categoriaId: producto.categoriaId || undefined,
    marcaId: producto.marcaId || undefined,
    principioActivo: producto.principioActivo || '',
    unidad: producto.unidad,
    precioCompra: producto.precioCompra,
    precioVenta: producto.precioVenta,
    margen: producto.margen,
    stockMinimo: producto.stockMinimo,
    stockMaximo: producto.stockMaximo,
    esControlado: producto.esControlado,
    esMedicamento: leerEsMedicamento(producto),
    descripcion: producto.descripcion || ''
  };
  loadSelects();
  modalOpen.value = true;
}

function seleccionarEsMedicamento(valor: boolean) {
  form.value.esMedicamento = valor;
  errorClasificacion.value = '';
}

async function handleSubmit() {
  // R1.1: en ALTA no se envia sin decision explicita.
  // R1.5: en EDICION una clasificacion desconocida NO bloquea otros cambios:
  // se omite el campo y el backend preserva el valor almacenado.
  if (form.value.esMedicamento === null && !esEdicion.value) {
    errorClasificacion.value = 'Debes indicar si el producto es medicamento (Sí/No).';
    return;
  }

  errorClasificacion.value = '';
  loadingSubmit.value = true;
  try {
    const { esMedicamento, ...resto } = form.value;

    if (esMedicamento === null) {
      // Clasificacion desconocida en edicion: no se envia el campo (R1.5).
      await productoStore.actualizarProducto(productoIdEditando.value as string, { ...resto } as UpdateProductoDto);
    } else {
      const payload = { ...resto, esMedicamento } as CreateProductoDto;

      if (esEdicion.value && productoIdEditando.value) {
        await productoStore.actualizarProducto(productoIdEditando.value, payload as UpdateProductoDto);
      } else {
        await productoStore.crearProducto(payload);
      }
    }

    modalOpen.value = false;
    await productoStore.fetchProductos();
  } catch {
    // El store ya emite toast.error y relanza el error. Aquí SOLO se contiene
    // la promesa rechazada para evitar unhandled rejection en el event handler
    // de Vue. El modal permanece abierto con los valores intactos.
  } finally {
    loadingSubmit.value = false;
  }
}

function confirmarEliminar(id: string) {
  productoAEliminar.value = id;
  confirmOpen.value = true;
}

async function handleEliminar() {
  if (productoAEliminar.value) {
    try {
      await productoStore.eliminarProducto(productoAEliminar.value);
      confirmOpen.value = false;
      productoAEliminar.value = null;
    } catch {
      // El store ya emite toast.error y relanza. El diálogo permanece abierto.
      // Solo se contiene la rechazada para evitar unhandled rejection.
    }
  }
}

function cambioPagina(nuevaPagina: number) {
  productoStore.fetchProductos(nuevaPagina);
}

function getCategoriaNombre(id: string | null): string {
  if (!id) return '-';
  const cat = categoriaStore.categorias.find(c => c.id === id);
  return cat?.nombre || '-';
}

function getMarcaNombre(id: string | null): string {
  if (!id) return '-';
  const marca = marcaStore.marcas.find(m => m.id === id);
  return marca?.nombre || '-';
}

const pagination = computed(() => productoStore.pagination);

// Funciones para creación rápida
function abrirModalCategoria() {
  quickForm.value = { nombre: '', descripcion: '' };
  modalCategoriaOpen.value = true;
}

function abrirModalMarca() {
  quickForm.value = { nombre: '', descripcion: '' };
  modalMarcaOpen.value = true;
}

async function handleCrearCategoria() {
  loadingQuickSubmit.value = true;
  try {
    await categoriaStore.crearCategoria(quickForm.value);
    modalCategoriaOpen.value = false;
  } finally {
    loadingQuickSubmit.value = false;
  }
}

async function handleCrearMarca() {
  loadingQuickSubmit.value = true;
  try {
    await marcaStore.crearMarca(quickForm.value);
    modalMarcaOpen.value = false;
  } finally {
    loadingQuickSubmit.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Productos</h1>
        <p class="text-sm text-[var(--color-text-secondary)]">Gestiona el inventario de productos</p>
      </div>
      <button
        @click="abrirModalCrear"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Producto
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nombre, código o principio activo..."
        class="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
      />
    </div>

    <!-- Table -->
    <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Código</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Categoría</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Marca</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Precio</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Stock</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="productoStore.loading" class="text-center">
              <td colspan="8" class="px-4 py-8">
                <TableSkeleton :columns="8" :rows="5" />
              </td>
            </tr>
            <tr v-else-if="productoStore.error" class="text-center">
              <td colspan="8" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ productoStore.error }}</p>
                  <p class="text-xs text-[var(--color-text-secondary)]">No se pudieron cargar los productos. Verificá la conexión con el servidor e intentá nuevamente.</p>
                  <button
                    @click="productoStore.fetchProductos(pagination.page)"
                    class="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-else-if="productoStore.productos.length === 0" class="text-center">
              <td colspan="8" class="px-4 py-12">
                <div class="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-[var(--color-text-secondary)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p class="text-[var(--color-text-secondary)]">No hay productos registrados</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="producto in productoStore.productos"
              :key="producto.id"
              class="hover:bg-[var(--color-bg)] transition-colors duration-150"
            >
              <td class="px-4 py-3 text-sm font-mono text-[var(--color-text-secondary)]">
                {{ producto.codigo }}
              </td>
              <td class="px-4 py-3">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-medium text-[var(--color-text-primary)]">{{ producto.nombre }}</p>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                      :class="leerEsMedicamento(producto) === true
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : leerEsMedicamento(producto) === false
                          ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'"
                    >
                      {{ leerEsMedicamento(producto) === true
                        ? 'Medicamento'
                        : leerEsMedicamento(producto) === false
                          ? 'No medicamento'
                          : 'Sin clasificar' }}
                    </span>
                  </div>
                  <p v-if="producto.principioActivo" class="text-xs text-[var(--color-text-secondary)] mt-0.5">{{ producto.principioActivo }}</p>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg)] text-xs">
                  {{ getCategoriaNombre(producto.categoriaId) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg)] text-xs">
                  {{ getMarcaNombre(producto.marcaId) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-right">
                <span class="font-semibold text-[var(--color-text-primary)]">S/ {{ producto.precioVenta.toFixed(2) }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="[
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  producto.stockMinimo > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                ]">
                  {{ producto.stockMinimo }} / {{ producto.stockMaximo }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span :class="[
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  producto.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                ]">
                  {{ producto.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="abrirModalEditar(producto)"
                    class="p-2 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="confirmarEliminar(producto.id)"
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
    <Modal :open="modalOpen" :title="esEdicion ? 'Editar Producto' : 'Nuevo Producto'" size="xl" @close="modalOpen = false">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Información Básica -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre del producto <span class="text-red-500">*</span></label>
            <input
              v-model="form.nombre"
              type="text"
              required
              placeholder="Ej: Paracetamol 500mg"
              class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
          </div>
          
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Principio activo</label>
            <input
              v-model="form.principioActivo"
              type="text"
              placeholder="Ej: Paracetamol"
              class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
          </div>
        </div>

        <!-- Categoría y Marca -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Categoría</label>
              <button
                @click="abrirModalCategoria"
                type="button"
                class="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
              >
                + Nueva
              </button>
            </div>
            <div class="relative">
              <select
                v-model="form.categoriaId"
                :disabled="loadingSelects"
                class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none"
              >
                <option :value="undefined">Seleccionar categoría</option>
                <option v-for="cat in categoriaStore.categorias" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronDown" />
              </svg>
            </div>
          </div>
          
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Marca</label>
              <button
                @click="abrirModalMarca"
                type="button"
                class="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
              >
                + Nueva
              </button>
            </div>
            <div class="relative">
              <select
                v-model="form.marcaId"
                :disabled="loadingSelects"
                class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none"
              >
                <option :value="undefined">Seleccionar marca</option>
                <option v-for="marca in marcaStore.marcas" :key="marca.id" :value="marca.id">{{ marca.nombre }}</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="Icons.chevronDown" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Precios -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Precio de compra (S/)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">S/</span>
              <input
                v-model.number="form.precioCompra"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full pl-8 pr-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Precio de venta (S/)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">S/</span>
              <input
                v-model.number="form.precioVenta"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full pl-8 pr-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Margen (%)</label>
            <div class="relative">
              <input
                v-model.number="form.margen"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="20"
                class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">%</span>
            </div>
          </div>
        </div>

        <!-- Stock -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Stock mínimo</label>
              <input
                v-model.number="form.stockMinimo"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-[var(--color-text-primary)]">Stock máximo</label>
              <input
                v-model.number="form.stockMaximo"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--color-text-primary)]">Unidad de medida</label>
            <div class="relative">
              <select
                v-model="form.unidad"
                class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none"
              >
                <option
                  v-for="unidad in unidadMedidaStore.unidades"
                  :key="unidad.id"
                  :value="unidad.abreviatura"
                >
                  {{ unidad.nombre }} ({{ unidad.abreviatura }})
                </option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Clasificación esMedicamento (R1) -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">
            ¿Es medicamento? <span class="text-red-500">*</span>
          </label>
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="esMedicamento"
                value="si"
                :checked="form.esMedicamento === true"
                @change="seleccionarEsMedicamento(true)"
                class="w-4 h-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <span class="text-sm text-[var(--color-text-primary)]">Sí</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="esMedicamento"
                value="no"
                :checked="form.esMedicamento === false"
                @change="seleccionarEsMedicamento(false)"
                class="w-4 h-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <span class="text-sm text-[var(--color-text-primary)]">No</span>
            </label>
            <p class="text-xs text-[var(--color-text-secondary)]">
              Si es medicamento, la compra exige lote y vencimiento y la venta descuenta por FEFO automáticamente.
            </p>
          </div>
          <p v-if="errorClasificacion" class="text-xs text-red-500">{{ errorClasificacion }}</p>
          <p
            v-else-if="esEdicion && form.esMedicamento === null"
            class="text-xs text-amber-600 dark:text-amber-400"
          >
            El backend no informó la clasificación de este producto. Se conservará la almacenada
            al guardar; elegí Sí/No solo si querés reclasificarlo ahora.
          </p>
        </div>

        <!-- Checkbox y Descripción -->
        <div class="flex items-start gap-3">
          <div class="flex items-center h-5">
            <input
              v-model="form.esControlado"
              type="checkbox"
              id="esControlado"
              class="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
            />
          </div>
          <div class="ml-2">
            <label for="esControlado" class="text-sm font-medium text-[var(--color-text-primary)]">Producto controlado</label>
            <p class="text-xs text-[var(--color-text-secondary)]">Marcar si requiere control especial (receta médica)</p>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Descripción</label>
          <textarea
            v-model="form.descripcion"
            rows="2"
            placeholder="Descripción adicional del producto..."
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
            :disabled="loadingSubmit || (!esEdicion && form.esMedicamento === null)"
            class="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <Spinner v-if="loadingSubmit" size="sm" />
            {{ esEdicion ? 'Actualizar producto' : 'Crear producto' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Modal rápido: Nueva Categoría -->
    <Modal :open="modalCategoriaOpen" title="Nueva Categoría" size="sm" @close="modalCategoriaOpen = false">
      <form @submit.prevent="handleCrearCategoria" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="quickForm.nombre"
            type="text"
            required
            placeholder="Ej: Analgésicos"
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Descripción</label>
          <textarea
            v-model="quickForm.descripcion"
            rows="2"
            placeholder="Descripción opcional..."
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all resize-none"
          ></textarea>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="modalCategoriaOpen = false"
            class="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            @click="handleCrearCategoria"
            :disabled="loadingQuickSubmit"
            class="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            <Spinner v-if="loadingQuickSubmit" size="sm" />
            Crear
          </button>
        </div>
      </template>
    </Modal>

    <!-- Modal rápido: Nueva Marca -->
    <Modal :open="modalMarcaOpen" title="Nueva Marca" size="sm" @close="modalMarcaOpen = false">
      <form @submit.prevent="handleCrearMarca" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Nombre <span class="text-red-500">*</span></label>
          <input
            v-model="quickForm.nombre"
            type="text"
            required
            placeholder="Ej: Bayer"
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--color-text-primary)]">Descripción</label>
          <textarea
            v-model="quickForm.descripcion"
            rows="2"
            placeholder="Descripción opcional..."
            class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all resize-none"
          ></textarea>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="modalMarcaOpen = false"
            class="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            @click="handleCrearMarca"
            :disabled="loadingQuickSubmit"
            class="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all duration-200 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            <Spinner v-if="loadingQuickSubmit" size="sm" />
            Crear
          </button>
        </div>
      </template>
    </Modal>

    <!-- Confirm Delete -->
    <ConfirmDialog
      :open="confirmOpen"
      title="Eliminar Producto"
      message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
      confirm-text="Eliminar"
      type="danger"
      @confirm="handleEliminar"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
