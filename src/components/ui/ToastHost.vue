<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { PhWarningCircle, PhX } from '@phosphor-icons/vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-8"
  >
    <button
      v-for="toast in toasts"
      :key="toast.id"
      type="button"
      class="pointer-events-auto flex max-w-[360px] items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-left text-[14px] leading-5 text-ink shadow-[0_8px_24px_rgba(43,36,32,0.08)]"
      @click="ui.dismissToast()"
    >
      <PhWarningCircle :size="18" class="mt-0.5 shrink-0 text-danger" weight="regular" />
      <span>{{ toast.message }}</span>
      <PhX :size="16" class="mt-0.5 ml-2 shrink-0 text-ink-3" weight="regular" />
    </button>
  </div>
</template>
