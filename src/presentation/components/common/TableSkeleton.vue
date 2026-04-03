<script setup lang="ts">
defineProps<{
  columns: number;
  rows?: number;
}>();
</script>

<template>
  <div class="animate-pulse">
    <table class="w-full">
      <thead class="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <tr>
          <th v-for="n in columns" :key="n" class="px-4 py-3 text-left">
            <div class="h-4 bg-[var(--color-border)] rounded w-20"></div>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--color-border)]">
        <tr v-for="row in (rows || 5)" :key="row">
          <td v-for="col in columns" :key="col" class="px-4 py-3">
            <div class="h-4 bg-[var(--color-border)] rounded" :class="col === 1 ? 'w-32' : col === columns ? 'w-16 ml-auto' : 'w-24'"></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>