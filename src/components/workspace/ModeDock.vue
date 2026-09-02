<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { PhCheck, PhCrosshair, PhRuler } from '@phosphor-icons/vue'
import { useInteractionStore, type ToolMode } from '@/stores/interaction'

const interaction = useInteractionStore()
const { mode } = storeToRefs(interaction)

function setMode(next: ToolMode) {
  interaction.setMode(next)
}
</script>

<template>
  <nav
    class="flex shrink-0 gap-1 border-t border-line/80 bg-surface px-3 pt-1 pb-[max(8px,env(safe-area-inset-bottom))]"
    aria-label="工具模式"
  >
    <button
      type="button"
      class="inline-flex h-12 min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium"
      :class="mode === 'select' ? 'bg-brand-soft text-brand' : 'text-ink-2'"
      @click="setMode('select')"
    >
      <PhCrosshair :size="18" :weight="mode === 'select' ? 'fill' : 'regular'" />
      选择
    </button>
    <button
      type="button"
      class="inline-flex h-12 min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium"
      :class="mode === 'count' ? 'bg-brand-soft text-brand' : 'text-ink-2'"
      @click="setMode('count')"
    >
      <PhRuler :size="18" :weight="mode === 'count' ? 'fill' : 'regular'" />
      数格
    </button>
    <button
      type="button"
      class="inline-flex h-12 min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium"
      :class="mode === 'complete' ? 'bg-brand-soft text-brand' : 'text-ink-2'"
      @click="setMode('complete')"
    >
      <PhCheck :size="18" :weight="mode === 'complete' ? 'fill' : 'regular'" />
      完成
    </button>
  </nav>
</template>
