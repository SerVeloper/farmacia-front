<script setup lang="ts">
import { RouterView } from 'vue-router'
import MainLayout from '@/presentation/layouts/MainLayout.vue'
import ToastContainer from '@/presentation/components/common/ToastContainer.vue'
</script>

<template>
  <MainLayout>
    <RouterView />
  </MainLayout>
  <ToastContainer />
</template>