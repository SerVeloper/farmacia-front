<script setup lang="ts">
import { reactive, ref } from 'vue';

import { useAuthStore } from '@/application/stores/auth.store';
import type { RecoveryChannel } from '@/domain/types/auth';

const authStore = useAuthStore();

const form = reactive({
  identifier: '',
  channel: 'auto' as RecoveryChannel,
});

const submitting = ref(false);
const submitted = ref(false);

async function submitRequest() {
  submitting.value = true;
  try {
    await authStore.forgotPassword(form);
    submitted.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1e3a8a_0%,_#020617_60%)]" />
    <div class="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
      <section class="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.2em] text-cyan-200">Recuperacion</p>
          <h1 class="text-2xl font-semibold">Recuperar contrasena</h1>
          <p class="text-sm text-slate-300">
            Ingresa tu email o telefono y te enviaremos instrucciones por el canal elegido.
          </p>
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="submitRequest">
          <label class="block space-y-2">
            <span class="text-sm text-slate-200">Email o telefono</span>
            <input
              v-model="form.identifier"
              type="text"
              required
              class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm text-slate-200">Canal</span>
            <select
              v-model="form.channel"
              class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
            >
              <option value="auto">Automatico</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {{ submitting ? 'Enviando...' : 'Enviar instrucciones' }}
          </button>
        </form>

        <p v-if="submitted" class="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
          Si existe una cuenta asociada, enviamos las instrucciones.
        </p>

        <RouterLink to="/login" class="mt-4 inline-flex text-sm text-cyan-200 transition hover:text-cyan-100">
          Volver al inicio de sesion
        </RouterLink>
      </section>
    </div>
  </div>
</template>
