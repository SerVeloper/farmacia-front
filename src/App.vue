<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import MainLayout from '@/presentation/layouts/MainLayout.vue';
import ToastContainer from '@/presentation/components/common/ToastContainer.vue';

const route = useRoute();
const useAuthLayout = computed(() => route.meta.layout === 'auth');
</script>

<template>
  <MainLayout v-if="!useAuthLayout" />
  <RouterView v-else />
  <ToastContainer />
</template>
