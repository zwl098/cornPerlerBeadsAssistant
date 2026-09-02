<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBeadCanvas } from '@/composables/useBeadCanvas'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { scalePercent, fit, zoomIn, zoomOut } = useBeadCanvas(canvasRef)

onMounted(() => {
  canvasRef.value?.focus()
})

defineExpose({ scalePercent, fit, zoomIn, zoomOut })
</script>

<template>
  <canvas
    ref="canvasRef"
    class="block size-full touch-none select-none"
    style="touch-action: none; overscroll-behavior: none"
    tabindex="0"
    aria-label="拼豆图纸画布"
  />
</template>
