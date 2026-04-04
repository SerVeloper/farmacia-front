import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { authApi } from '@/infrastructure/api/auth.api';
import { setAuthClientHandlers } from '@/infrastructure/api/client';
import { useToastStore } from '@/application/stores/toast.store';
import type {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from '@/domain/types/auth';
import type { AclAction, AclModule } from '@/domain/types/acl';
import { hasAclPermission } from '@/domain/types/acl';
import { getRoleLabel, normalizeUserRole, type User, type UserRole } from '@/domain/types/user';

const AUTH_USER_KEY = 'farmacia_user';

export const useAuthStore = defineStore('auth', () => {
  const toast = useToastStore();

  const token = ref<string | null>(null);
  const user = ref<User | null>(readStoredUser());
  const initialized = ref(false);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const normalizedRole = computed(() => normalizeUserRole(user.value?.rol));
  const roleLabel = computed(() => getRoleLabel(user.value?.rol));

  setAuthClientHandlers({
    getAccessToken: () => token.value,
    refreshSession: async () => {
      try {
        const response = await authApi.refresh();
        token.value = response.accessToken;
        return token.value;
      } catch {
        clearLocalSession();
        return null;
      }
    },
    onUnauthorized: () => {
      clearLocalSession();
    },
  });

  async function login(dto: LoginDto) {
    loading.value = true;
    try {
      const response = await authApi.login(dto);
      token.value = response.accessToken;
      user.value = response.user;
      initialized.value = true;

      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
      toast.success(`Bienvenido, ${response.user.nombre}`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo iniciar sesion';
      toast.error(Array.isArray(message) ? message[0] : message);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function refreshProfile() {
    if (!token.value) {
      return;
    }

    try {
      const profile = await authApi.me();
      user.value = profile;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
    } catch {
      clearLocalSession();
    }
  }

  async function initializeSession() {
    if (initialized.value) {
      return;
    }

    initialized.value = true;

    try {
      const refreshResponse = await authApi.refresh();
      token.value = refreshResponse.accessToken;
      await refreshProfile();
    } catch {
      clearLocalSession();
    }
  }

  async function logout(showToast = true) {
    clearLocalSession();

    try {
      await authApi.logout();
    } catch {
      // noop
    }

    if (showToast) {
      toast.info('Sesion cerrada');
    }
  }

  async function forgotPassword(dto: ForgotPasswordDto) {
    const response = await authApi.forgotPassword(dto);
    toast.info(response.message);
    return response;
  }

  async function resetPassword(dto: ResetPasswordDto) {
    const response = await authApi.resetPassword(dto);
    toast.success(response.message);
    return response;
  }

  function clearLocalSession() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(AUTH_USER_KEY);
  }

  function hasRole(roles: UserRole[]) {
    if (!user.value) return false;

    const currentRole = user.value.rol;
    const currentNormalizedRole = normalizeUserRole(currentRole);

    return roles.some((role) => {
      if (role === currentRole) {
        return true;
      }

      return normalizeUserRole(role) === currentNormalizedRole;
    });
  }

  function canAccess(modulo: AclModule, accion: AclAction = 'ver') {
    return hasAclPermission(user.value?.rol, { modulo, accion });
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    normalizedRole,
    roleLabel,
    initialized,
    login,
    initializeSession,
    refreshProfile,
    logout,
    forgotPassword,
    resetPassword,
    hasRole,
    canAccess,
  };
});

function readStoredUser(): User | null {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}
