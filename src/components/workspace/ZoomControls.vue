<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { PhCornersOut, PhMinus, PhPlus } from '@phosphor-icons/vue'
import { useViewportStore } from '@/stores/viewport'

const viewport = useViewportStore()
const { scalePercent } = storeToRefs(viewport)

const emit = defineEmits<{
  in: []
  out: []
  fit: []
}>()
</script>

<template>
  <div
    class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-2"
  >
    <div
      class="pointer-events-auto flex items-center gap-1 rounded-xl border border-line/80 bg-surface/92 px-2 py-1 shadow-[0_8px_24px_rgba(43,36,32,0.08)] backdrop-blur-sm"
    >
      <button
        type="button"
        class="inline-flex size-11 items-center justify-center rounded-lg text-ink"
        aria-label="缩小"
        @click="emit('out')"
      >
        <PhMinus :size="18" weight="regular" />
      </button>
      <span class="min-w-12 text-center font-mono text-[13px] text-ink-2">{{ scalePercent }}%</span>
      <button
        type="button"
        class="inline-flex size-11 items-center justify-center rounded-lg text-ink"
        aria-label="放大"
        @click="emit('in')"
      >
        <PhPlus :size="18" weight="regular" />
      </button>
      <button
        type="button"
        class="ml-1 inline-flex h-11 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-ink-2"
        @click="emit('fit')"
      >
        <PhCornersOut :size="16" weight="regular" />
        适应
      </button>
    </div>
  </div>
</template>
