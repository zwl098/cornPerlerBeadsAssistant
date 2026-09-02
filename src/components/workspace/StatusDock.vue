<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { completionPercent } from '@/models/progressStats'
import { useInteractionStore } from '@/stores/interaction'
import { useProgressStore } from '@/stores/progress'
import { useProjectStore } from '@/stores/project'

const interaction = useInteractionStore()
const progress = useProgressStore()
const project = useProjectStore()
const { label, countResult, mode } = storeToRefs(interaction)
const { doneCount } = storeToRefs(progress)
const { totalCells } = storeToRefs(project)

const percent = computed(() => completionPercent(doneCount.value, totalCells.value))
</script>

<template>
  <div
    class="border-b border-line/80 bg-surface/90 px-3 py-2"
    aria-live="polite"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p
          class="font-mono text-[13px] leading-5 md:text-[15px]"
          :class="mode === 'count' || countResult ? 'text-ink' : 'text-ink-3'"
        >
          {{ label }}
        </p>
        <p
          v-if="countResult && mode === 'count'"
          class="mt-0.5 font-mono text-[12px] leading-4 text-ok"
        >
          横 {{ countResult.colSpan }} 格 · 纵 {{ countResult.rowSpan }} 格 · 共 {{ countResult.total }} 格
        </p>
      </div>
      <div class="shrink-0 text-right font-mono text-ink-2">
        <p class="text-[13px] leading-5">已完成 {{ doneCount }} / {{ totalCells }}</p>
        <p class="text-[12px] leading-4">{{ percent }}%</p>
      </div>
    </div>
  </div>
</template>
