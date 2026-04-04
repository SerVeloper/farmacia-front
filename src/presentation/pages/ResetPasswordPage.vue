<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/application/stores/auth.store';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  token: (route.query.token as string) || '',
  newPassword: '',
  confirmPassword: '',
});

const submitting = ref(false);

async function submitReset() {
  if (form.newPassword !== form.confirmPassword) {
    return;
  }

  submitting.value = true;
  try {
    await authStore.resetPassword({
      token: form.token,
      newPassword: form.newPassword,
    });
    await router.push('/login');
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
          <h1 class="text-2xl font-semibold">Nueva contrasena</h1>
          <p class="text-sm text-slate-300">Ingresa el token recibido y define una nueva contrasena.</p>
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="submitReset">
          <label class="block space-y-2">
            <span class="text-sm text-slate-200">Token</span>
            <input
              v-model="form.token"
              type="text"
              required
              class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm text-slate-200">Nueva contrasena</span>
            <input
              v-model="form.newPassword"
              type="password"
              minlength="6"
              required
              class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm text-slate-200">Confirmar contrasena</span>
            <input
              v-model="form.confirmPassword"
              type="password"
              minlength="6"
              required
              class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
            />
          </label>

          <p v-if="form.newPassword !== form.confirmPassword && form.confirmPassword" class="text-sm text-red-300">
            Las contrasenas no coinciden.
          </p>

          <button
            type="submit"
            :disabled="submitting || form.newPassword !== form.confirmPassword"
            class="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {{ submitting ? 'Actualizando...' : 'Actualizar contrasena' }}
          </button>
        </form>

        <RouterLink to="/login" class="mt-4 inline-flex text-sm text-cyan-200 transition hover:text-cyan-100">
          Volver al inicio de sesion
        </RouterLink>
      </section>
    </div>
  </div>
</template>
