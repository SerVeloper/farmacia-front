<script setup lang="ts">
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">Bienvenido</h1>
      <p class="text-[var(--color-text-secondary)]">Sistema de gestión de farmacia</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-[var(--color-text-secondary)]">Productos</p>
            <p class="text-2xl font-bold text-[var(--color-text-primary)]">0</p>
          </div>
        </div>
      </div>

      <div class="p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-[var(--color-text-secondary)]">Ventas Hoy</p>
            <p class="text-2xl font-bold text-[var(--color-text-primary)]">0</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>