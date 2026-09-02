<script setup lang="ts">
import ToastHost from '@/components/ui/ToastHost.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { useProjectPersist } from '@/composables/useProjectPersist'

useProjectPersist()
</script>

<template>
  <RouterView />
  <ToastHost />
  <AppModal />
</template>
