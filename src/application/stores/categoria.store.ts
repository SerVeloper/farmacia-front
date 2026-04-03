import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Categoria, CreateCategoriaDto, UpdateCategoriaDto } from '@/domain/types/categoria';
import { categoriasApi } from '@/infrastructure/api/categorias.api';
import { useToastStore } from '@/application/stores/toast.store';

export const useCategoriaStore = defineStore('categorias', () => {
  const categorias = ref<Categoria[]>([]);
  const loading = ref(false);
  const toast = useToastStore();

  async function fetchCategorias() {
    loading.value = true;
    try {
      categorias.value = await categoriasApi.getAll();
    } catch (e) {
      toast.error('Error al cargar categorías');
    } finally {
      loading.value = false;
    }
  }

  async function crearCategoria(dto: CreateCategoriaDto) {
    try {
      const nueva = await categoriasApi.create(dto);
      categorias.value.unshift(nueva);
      toast.success('Categoría creada');
      return nueva;
    } catch (e) {
      toast.error('Error al crear categoría');
      throw e;
    }
  }

  async function actualizarCategoria(id: string, dto: UpdateCategoriaDto) {
    try {
      const actualizada = await categoriasApi.update(id, dto);
      const index = categorias.value.findIndex(c => c.id === id);
      if (index !== -1) categorias.value[index] = actualizada;
      toast.success('Categoría actualizada');
      return actualizada;
    } catch (e) {
      toast.error('Error al actualizar categoría');
      throw e;
    }
  }

  async function eliminarCategoria(id: string) {
    try {
      await categoriasApi.delete(id);
      categorias.value = categorias.value.filter(c => c.id !== id);
      toast.success('Categoría eliminada');
    } catch (e) {
      toast.error('Error al eliminar categoría');
      throw e;
    }
  }

  return { categorias, loading, fetchCategorias, crearCategoria, actualizarCategoria, eliminarCategoria };
});