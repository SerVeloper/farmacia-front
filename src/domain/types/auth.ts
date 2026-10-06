import type { User } from './user';

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
  sucursalActivaId?: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  sessionExpiresIn: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  sessionExpiresIn: string;
  sucursalActivaId?: string | null;
}

export interface RefreshDto {
  refreshToken?: string;
  sucursalActivaId?: string;
}

export type RecoveryChannel = 'auto' | 'email' | 'whatsapp';

export interface ForgotPasswordDto {
  identifier: string;
  channel?: RecoveryChannel;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface LoginSucursalOption {
  id: string;
  codigo: string;
  nombre: string;
}
