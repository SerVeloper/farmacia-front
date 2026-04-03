import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useToastStore } from '@/application/stores/toast.store';
import type {
  CreateSucursalDto,
  Sucursal,
  UpdateSucursalDto,
} from '@/domain/types/sucursal';
import { sucursalesApi } from '@/infrastructure/api/sucursales.api';

export const useSucursalStore = defineStore('sucursales', () => {
  const toast = useToastStore();

  const sucursales = ref<Sucursal[]>([]);
  const loading = ref(false);

  async function fetchSucursales() {
    loading.value = true;
    try {
      sucursales.value = await sucursalesApi.getAll();
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudieron cargar las sucursales';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loading.value = false;
    }
  }

  async function createSucursal(dto: CreateSucursalDto) {
    loading.value = true;
    try {
      const sucursal = await sucursalesApi.create(dto);
      sucursales.value.unshift(sucursal);
      toast.success('Sucursal creada');
      return sucursal;
    } finally {
      loading.value = false;
    }
  }

  async function updateSucursal(id: string, dto: UpdateSucursalDto) {
    loading.value = true;
    try {
      const updated = await sucursalesApi.update(id, dto);
      const index = sucursales.value.findIndex((sucursal) => sucursal.id === id);
      if (index >= 0) {
        sucursales.value[index] = updated;
      }
      toast.success('Sucursal actualizada');
      return updated;
    } finally {
      loading.value = false;
    }
  }

  async function disableSucursal(id: string) {
    loading.value = true;
    try {
      await sucursalesApi.delete(id);
      sucursales.value = sucursales.value.map((sucursal) =>
        sucursal.id === id
          ? {
              ...sucursal,
              activo: false,
            }
          : sucursal,
      );
      toast.success('Sucursal desactivada');
    } finally {
      loading.value = false;
    }
  }

  return {
    sucursales,
    loading,
    fetchSucursales,
    createSucursal,
    updateSucursal,
    disableSucursal,
  };
});
