import type { User } from './user';

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
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
