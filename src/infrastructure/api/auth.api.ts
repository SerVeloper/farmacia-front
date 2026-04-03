import apiClient from '@/infrastructure/api/client';
import type { LoginDto, LoginResponse } from '@/domain/types/auth';
import type { User } from '@/domain/types/user';

export const authApi = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', dto);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
};
