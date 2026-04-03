import apiClient from '@/infrastructure/api/client';
import type { CreateUserDto, UpdateUserDto, User } from '@/domain/types/user';

export const usersApi = {
  async getAll(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  async create(dto: CreateUserDto): Promise<User> {
    const { data } = await apiClient.post<User>('/users', dto);
    return data;
  },

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}`, dto);
    return data;
  },

  async resetPassword(id: string, password: string): Promise<void> {
    await apiClient.patch(`/users/${id}/reset-password`, { password });
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
