<script setup lang="ts">
import { ref } from 'vue'
import { useMiniMap } from '@/composables/useMiniMap'

const canvasRef = ref<HTMLCanvasElement | null>(null)
useMiniMap(canvasRef)
</script>

<template>
  <div
    class="pointer-events-none absolute top-5 right-5 z-20"
  >
    <div
      class="pointer-events-auto overflow-hidden rounded-xl border border-line/80 bg-surface/92 p-1 shadow-[0_8px_24px_rgba(43,36,32,0.08)] backdrop-blur-sm"
    >
      <canvas
        ref="canvasRef"
        class="block size-[120px] cursor-pointer touch-none select-none rounded-lg"
        style="touch-action: none"
        aria-label="图纸小地图"
      />
    </div>
  </div>
</template>
