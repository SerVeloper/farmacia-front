<script setup lang="ts">
import Modal from './Modal.vue';

defineProps<{
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Modal :open="open" size="sm" @close="emit('cancel')">
    <div class="text-center">
      <div :class="['mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4', type === 'danger' ? 'bg-[var(--color-error)]/10' : 'bg-[var(--color-accent)]/10']">
        <svg xmlns="http://www.w3.org/2000/svg" :class="['w-6 h-6', type === 'danger' ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{{ title || 'Confirmar acción' }}</h3>
      <p class="text-[var(--color-text-secondary)] mb-6">{{ message }}</p>
      <div class="flex gap-3 justify-center">
        <button
          @click="emit('cancel')"
          class="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          {{ cancelText || 'Cancelar' }}
        </button>
        <button
          @click="emit('confirm')"
          :class="['px-4 py-2 rounded-lg text-white transition-colors', type === 'danger' ? 'bg-[var(--color-error)] hover:bg-[var(--color-error)]/90' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]']"
        >
          {{ confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  </Modal>
</template>