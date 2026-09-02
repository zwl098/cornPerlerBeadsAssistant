<script setup lang="ts">
import { PhCircleNotch, PhUploadSimple } from '@phosphor-icons/vue'

const props = defineProps<{
  busy?: boolean
}>()

const emit = defineEmits<{
  upload: []
}>()
</script>

<template>
  <div class="flex flex-col items-stretch gap-3 md:items-start">
    <button
      type="button"
      class="inline-flex h-[52px] min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 text-[16px] font-semibold text-white transition-colors duration-150 enabled:hover:bg-brand-pressed enabled:active:bg-brand-pressed disabled:cursor-wait disabled:opacity-80 md:h-12 md:w-60"
      :disabled="props.busy"
      @click="emit('upload')"
    >
      <PhCircleNotch v-if="props.busy" :size="20" class="animate-spin" weight="regular" />
      <PhUploadSimple v-else :size="20" weight="regular" />
      {{ props.busy ? '正在打开' : '上传拼豆图纸' }}
    </button>
    <p class="text-center text-[12px] leading-4 text-ink-3 md:text-left">图片只留在这台设备</p>
  </div>
</template>
