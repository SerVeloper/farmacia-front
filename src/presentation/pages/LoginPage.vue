<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/application/stores/auth.store';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
  sucursalActivaId: '',
});

const submitting = ref(false);

onMounted(async () => {
  await authStore.fetchLoginBranches();
});

async function submitLogin() {
  submitting.value = true;
  try {
    await authStore.login({
      ...form,
      sucursalActivaId: form.sucursalActivaId || undefined,
    });
    const redirectTo = (route.query.redirect as string) || '/';
    await router.push(redirectTo);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1e3a8a_0%,_#020617_60%)]" />
    <div class="absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
    <div class="absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

    <div class="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
      <div class="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur xl:grid-cols-2">
        <section class="hidden flex-col justify-between border-r border-white/10 p-10 xl:flex">
          <div class="space-y-4">
            <p class="text-xs uppercase tracking-[0.28em] text-cyan-200">MVP Fase 0</p>
            <h1 class="text-4xl font-semibold leading-tight">Control de acceso y usuarios para farmacia</h1>
            <p class="max-w-md text-sm text-slate-300">
              Inicio de sesion con JWT simple, perfiles por rol (nuevos + legacy temporal) y panel de gestion.
            </p>
          </div>
          <p class="text-xs text-slate-300">Tip: usa credenciales iniciales para validar el flujo completo.</p>
        </section>

        <section class="p-6 md:p-10">
          <div class="mx-auto max-w-md space-y-6">
            <div class="space-y-2">
              <p class="text-xs uppercase tracking-[0.2em] text-cyan-200">Farmacia App</p>
              <h2 class="text-2xl font-semibold">Iniciar sesion</h2>
              <p class="text-sm text-slate-300">Ingresa con tu usuario autorizado para continuar.</p>
            </div>

            <form class="space-y-4" @submit.prevent="submitLogin">
              <label class="block space-y-2">
                <span class="text-sm text-slate-200">Email</span>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm text-slate-200">Contrasena</span>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm text-slate-200">Sucursal activa</span>
                <select
                  v-model="form.sucursalActivaId"
                  class="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring"
                >
                  <option value="">Selecciona una sucursal</option>
                  <option
                    v-for="branch in authStore.loginBranches"
                    :key="branch.id"
                    :value="branch.id"
                  >
                    {{ branch.nombre }} ({{ branch.codigo }})
                  </option>
                </select>
                <p class="text-xs text-slate-400">
                  Obligatorio para administrador y contador en cada login.
                </p>
              </label>

              <label class="flex items-center gap-2 text-sm text-slate-300">
                <input
                  v-model="form.rememberMe"
                  type="checkbox"
                  class="h-4 w-4 rounded border-white/20 bg-slate-900/60"
                />
                Recordarme por 15 dias
              </label>

              <RouterLink
                to="/password/forgot"
                class="inline-flex text-sm text-cyan-200 transition hover:text-cyan-100"
              >
                Olvide mi contrasena
              </RouterLink>

              <button
                type="submit"
                :disabled="submitting"
                class="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {{ submitting ? 'Validando...' : 'Entrar al sistema' }}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
