import { defineStore } from 'pinia';
import { ref } from 'vue';

import { usersApi } from '@/infrastructure/api/users.api';
import { useToastStore } from '@/application/stores/toast.store';
import type { CreateUserDto, UpdateUserDto, User } from '@/domain/types/user';

export const useUserStore = defineStore('users', () => {
  const toast = useToastStore();

  const users = ref<User[]>([]);
  const loading = ref(false);

  async function fetchUsers() {
    loading.value = true;
    try {
      users.value = await usersApi.getAll();
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudieron cargar los usuarios';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      loading.value = false;
    }
  }

  async function createUser(dto: CreateUserDto) {
    loading.value = true;
    try {
      const user = await usersApi.create(dto);
      users.value.unshift(user);
      toast.success('Usuario creado');
      return user;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(id: string, dto: UpdateUserDto) {
    loading.value = true;
    try {
      const updated = await usersApi.update(id, dto);
      const index = users.value.findIndex((user) => user.id === id);
      if (index >= 0) users.value[index] = updated;
      toast.success('Usuario actualizado');
      return updated;
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(id: string, password: string) {
    loading.value = true;
    try {
      await usersApi.resetPassword(id, password);
      toast.success('Contrasena reseteada');
    } finally {
      loading.value = false;
    }
  }

  async function disableUser(id: string) {
    loading.value = true;
    try {
      await usersApi.delete(id);
      users.value = users.value.map((user) =>
        user.id === id
          ? {
              ...user,
              activo: false,
            }
          : user,
      );
      toast.success('Usuario desactivado');
    } finally {
      loading.value = false;
    }
  }

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    resetPassword,
    disableUser,
  };
});
