import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function show(type: ToastType, message: string, duration = 5000) {
    const id = ++toastId;
    toasts.value.push({ id, type, message, duration });
    
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
  }

  function remove(id: number) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) toasts.value.splice(index, 1);
  }

  function success(message: string, duration?: number) {
    show('success', message, duration);
  }

  function error(message: string, duration?: number) {
    show('error', message, duration);
  }

  function warning(message: string, duration?: number) {
    show('warning', message, duration);
  }

  function info(message: string, duration?: number) {
    show('info', message, duration);
  }

  return { toasts, show, remove, success, error, warning, info };
});