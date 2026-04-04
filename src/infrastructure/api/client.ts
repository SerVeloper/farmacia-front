import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

type AuthClientHandlers = {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<string | null>;
  onUnauthorized: () => void;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const handlers: AuthClientHandlers = {
  getAccessToken: () => null,
  refreshSession: async () => null,
  onUnauthorized: () => undefined,
};

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthClientHandlers(nextHandlers: Partial<AuthClientHandlers>) {
  if (nextHandlers.getAccessToken) {
    handlers.getAccessToken = nextHandlers.getAccessToken;
  }

  if (nextHandlers.refreshSession) {
    handlers.refreshSession = nextHandlers.refreshSession;
  }

  if (nextHandlers.onUnauthorized) {
    handlers.onUnauthorized = nextHandlers.onUnauthorized;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = handlers.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    if (shouldSkipRefresh(originalRequest.url || '')) {
      handlers.onUnauthorized();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      handlers.onUnauthorized();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      const refreshedToken = await new Promise<string | null>((resolve) => {
        pendingQueue.push(resolve);
      });

      if (!refreshedToken) {
        handlers.onUnauthorized();
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
      return apiClient(originalRequest);
    }

    isRefreshing = true;

    try {
      const refreshedToken = await handlers.refreshSession();
      flushQueue(refreshedToken);

      if (!refreshedToken) {
        handlers.onUnauthorized();
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(null);
      handlers.onUnauthorized();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function flushQueue(token: string | null): void {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

function shouldSkipRefresh(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/password/forgot') ||
    url.includes('/auth/password/reset')
  );
}

export default apiClient;
