import apiClient from '@/infrastructure/api/client';
import type { CreateUserDto, UpdateUserDto, User } from '@/domain/types/user';
import {
  CANONICAL_TO_LEGACY_ROLE,
  normalizeUserRole,
} from '@/domain/types/user';

function normalizeUser(user: User): User {
  const roleFromList = user.roles?.[0]?.codigo;
  const normalizedRole = normalizeUserRole(roleFromList ?? user.rol);

  return {
    ...user,
    rol: normalizedRole ?? user.rol,
  };
}

function buildUserPayload(dto: CreateUserDto | UpdateUserDto) {
  const canonicalRole = dto.rolesCodigos?.[0] ?? normalizeUserRole(dto.rol);

  if (!canonicalRole) {
    return dto;
  }

  return {
    ...dto,
    rolesCodigos: [canonicalRole],
    rol: CANONICAL_TO_LEGACY_ROLE[canonicalRole],
  };
}

export const usersApi = {
  async getAll(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>('/users');
    return data.map(normalizeUser);
  },

  async create(dto: CreateUserDto): Promise<User> {
    const { data } = await apiClient.post<User>('/users', buildUserPayload(dto));
    return normalizeUser(data);
  },

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}`, buildUserPayload(dto));
    return normalizeUser(data);
  },

  async resetPassword(id: string, password: string): Promise<void> {
    await apiClient.patch(`/users/${id}/reset-password`, { password });
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
