import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@/domain/types/marca';
import { marcasApi } from '@/infrastructure/api/marcas.api';
import { useToastStore } from '@/application/stores/toast.store';

export const useMarcaStore = defineStore('marcas', () => {
  const marcas = ref<Marca[]>([]);
  const loading = ref(false);
  const toast = useToastStore();

  async function fetchMarcas() {
    loading.value = true;
    try {
      marcas.value = await marcasApi.getAll();
    } catch (e) {
      toast.error('Error al cargar marcas');
    } finally {
      loading.value = false;
    }
  }

  async function crearMarca(dto: CreateMarcaDto) {
    try {
      const nueva = await marcasApi.create(dto);
      marcas.value.unshift(nueva);
      toast.success('Marca creada');
      return nueva;
    } catch (e) {
      toast.error('Error al crear marca');
      throw e;
    }
  }

  async function actualizarMarca(id: string, dto: UpdateMarcaDto) {
    try {
      const actualizada = await marcasApi.update(id, dto);
      const index = marcas.value.findIndex(m => m.id === id);
      if (index !== -1) marcas.value[index] = actualizada;
      toast.success('Marca actualizada');
      return actualizada;
    } catch (e) {
      toast.error('Error al actualizar marca');
      throw e;
    }
  }

  async function eliminarMarca(id: string) {
    try {
      await marcasApi.delete(id);
      marcas.value = marcas.value.filter(m => m.id !== id);
      toast.success('Marca eliminada');
    } catch (e) {
      toast.error('Error al eliminar marca');
      throw e;
    }
  }

  return { marcas, loading, fetchMarcas, crearMarca, actualizarMarca, eliminarMarca };
});