<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/application/stores/auth.store';
import { useLoginCampaign } from '@/application/composables/useLoginCampaign';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
});

const submitting = ref(false);
const { campaignName, campaignDescription, imageUrl, fallbackImage } = useLoginCampaign();

const currentYear = new Date().getFullYear();

async function submitLogin() {
  submitting.value = true;
  try {
    await authStore.login(form);
    const redirectTo = (route.query.redirect as string) || '/';
    await router.push(redirectTo);
  } finally {
    submitting.value = false;
  }
}

function handleCampaignImageError(event: Event) {
  const target = event.target as HTMLImageElement;

  if (target.dataset.fallbackApplied === 'true') {
    return;
  }

  target.dataset.fallbackApplied = 'true';
  target.src = fallbackImage;
}
</script>

<template>
  <div class="bg-bg px-4 py-8 md:px-6 md:py-12">
    <div class="mx-auto w-full max-w-5xl">
      <div class="grid w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-xl lg:grid-cols-2">
        <section class="hidden flex-col justify-between border-r border-border bg-primary p-8 text-white lg:flex">
          <div class="space-y-8">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-border text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span class="text-xl font-semibold tracking-tight">Farmacia App</span>
            </div>

            <div class="space-y-3">
              <p class="text-sm uppercase tracking-[0.22em] text-accent">Acceso seguro</p>
              <h1 class="text-3xl font-semibold leading-tight">
                Gestión moderna para tu operación farmacéutica.
              </h1>
              <p class="max-w-md text-white/85">
                Centraliza tus procesos y trabaja con una experiencia clara, rápida y profesional.
              </p>
            </div>

            <div class="overflow-hidden rounded-2xl border border-white/20 bg-black/20">
              <img
                :src="imageUrl"
                :alt="`Imagen de ${campaignName}`"
                class="h-44 w-full object-cover"
                @error="handleCampaignImageError"
              />
              <!-- <div class="border-t border-white/20 px-4 py-3 text-sm text-white/80">
                {{ campaignName }}
              </div> -->
            </div>
          </div>

          <p class="text-sm text-white/75">Plataforma empresarial de gestión farmacéutica</p>
        </section>

        <section class="p-6 md:p-8 lg:p-10">
          <div class="mx-auto flex h-full w-full max-w-md flex-col justify-between gap-6">
            <div class="space-y-6">
              <div class="space-y-2">
                <p class="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">Farmacia App</p>
                <h2 class="text-2xl font-semibold text-text-primary">Iniciar sesión</h2>
                <p class="text-sm text-text-secondary">Ingresa tus datos para continuar.</p>
              </div>

              <div class="overflow-hidden rounded-2xl border border-border lg:hidden">
                <img
                  :src="imageUrl"
                  :alt="`Imagen de ${campaignName}`"
                  class="h-32 w-full object-cover"
                  @error="handleCampaignImageError"
                />
                <div class="border-t border-border px-4 py-2 text-xs text-text-secondary">
                  {{ campaignDescription }}
                </div>
              </div>

              <form class="space-y-4" @submit.prevent="submitLogin">
                <div class="space-y-4">
                  <div class="space-y-2">
                    <label for="email" class="ml-1 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Correo electrónico</label>
                    <input
                      id="email"
                      v-model="form.email"
                      type="email"
                      placeholder="nombre@farmacia.com"
                      required
                      class="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center justify-between px-1">
                      <label for="password" class="text-xs font-semibold uppercase tracking-wider text-text-secondary">Contraseña</label>
                      <RouterLink to="/password/forgot" class="text-xs font-medium text-primary transition hover:text-primary-hover">
                        ¿Olvidaste tu contraseña?
                      </RouterLink>
                    </div>
                    <input
                      id="password"
                      v-model="form.password"
                      type="password"
                      placeholder="••••••••"
                      required
                      class="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-2 px-1">
                  <input
                    id="remember"
                    v-model="form.rememberMe"
                    type="checkbox"
                    class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label for="remember" class="cursor-pointer text-sm text-text-secondary">Recordarme</label>
                </div>

                <button
                  type="submit"
                  :disabled="submitting"
                  class="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <template v-if="submitting">
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Validando...
                  </template>
                  <template v-else>
                    Ingresar
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </template>
                </button>
              </form>
            </div>

            <footer class="border-t border-border pt-5 text-center text-sm text-text-secondary">
              © {{ currentYear }} -
              <a
                href="https://nextsofttech.com"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary underline decoration-border underline-offset-4 hover:text-primary-hover"
              >
                NextSoft
              </a>
            </footer>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
