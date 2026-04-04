import apiClient from '@/infrastructure/api/client';
import type { LoginDto, LoginResponse } from '@/domain/types/auth';
import type { User } from '@/domain/types/user';
import { normalizeUserRole } from '@/domain/types/user';

function normalizeAuthUser(user: User): User {
  const roleFromList = user.roles?.[0]?.codigo;
  const normalizedRole = normalizeUserRole(roleFromList ?? user.rol);

  return {
    ...user,
    rol: normalizedRole ?? user.rol,
  };
}

export const authApi = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', dto);
    return {
      ...data,
      user: normalizeAuthUser(data.user),
    };
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return normalizeAuthUser(data);
  },
};
