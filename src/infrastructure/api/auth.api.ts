import apiClient from '@/infrastructure/api/client';
import type {
  ForgotPasswordDto,
  LoginSucursalOption,
  LoginDto,
  LoginResponse,
  RefreshResponse,
  ResetPasswordDto,
} from '@/domain/types/auth';
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

  async getLoginBranches(): Promise<LoginSucursalOption[]> {
    const { data } = await apiClient.get<LoginSucursalOption[]>('/auth/branches');
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return normalizeAuthUser(data);
  },

  async refresh(): Promise<RefreshResponse> {
    const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {});
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout', {});
  },

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/password/forgot',
      dto,
    );

    return data;
  },

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/password/reset',
      dto,
    );

    return data;
  },
};
