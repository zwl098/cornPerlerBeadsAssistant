<script setup lang="ts">
import { computed, ref } from 'vue'
import { PIN_PRESETS, MAX_GRID_COUNT } from '@/models/types'

const props = defineProps<{
  rowCount: number
  colCount: number
  hasFirst: boolean
}>()

const emit = defineEmits<{
  pick: [rowCount: number, colCount: number]
  retry: []
}>()

const customOpen = ref(false)
const rowText = ref('')
const colText = ref('')
const waitingSize = computed(() => props.rowCount < 2 || props.colCount < 2)

function pick(row: number, col: number) {
  customOpen.value = false
  emit('pick', row, col)
}

function commitCustom() {
  const row = Number(rowText.value)
  const col = Number(colText.value)
  if (!Number.isInteger(row) || !Number.isInteger(col)) return
  if (row < 2 || col < 2 || row > MAX_GRID_COUNT || col > MAX_GRID_COUNT) return
  pick(row, col)
}
</script>

<template>
  <section
    class="shrink-0 border-t border-line/80 bg-surface px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]"
    aria-label="钉格子"
  >
    <div v-if="waitingSize" class="flex flex-col gap-2">
      <p class="text-[13px] leading-5 text-ink">这张图几格？选完点白底网格的两个角</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in PIN_PRESETS"
          :key="preset.label"
          type="button"
          class="inline-flex h-10 items-center rounded-lg bg-workspace px-3 font-mono text-[13px] text-ink"
          @click="pick(preset.rowCount, preset.colCount)"
        >
          {{ preset.label }}
          <span v-if="'hint' in preset" class="ml-1 font-sans text-[11px] text-ink-3">{{ preset.hint }}</span>
        </button>
        <button
          type="button"
          class="h-10 rounded-lg px-3 text-[13px] text-ink-2"
          :class="customOpen ? 'bg-brand-soft text-brand' : 'bg-workspace'"
          @click="customOpen = !customOpen"
        >
          其它
        </button>
      </div>
      <div v-if="customOpen" class="flex gap-2">
        <input
          v-model="rowText"
          inputmode="numeric"
          placeholder="行"
          class="h-10 w-20 rounded-lg border border-line px-2 font-mono text-[14px] outline-none focus:border-brand"
        />
        <input
          v-model="colText"
          inputmode="numeric"
          placeholder="列"
          class="h-10 w-20 rounded-lg border border-line px-2 font-mono text-[14px] outline-none focus:border-brand"
          @change="commitCustom"
        />
        <button type="button" class="h-10 rounded-lg bg-brand-soft px-3 text-[13px] font-medium text-brand" @click="commitCustom">
          用这个
        </button>
      </div>
    </div>

    <div v-else class="flex items-center justify-between gap-3">
      <p class="min-w-0 text-[13px] leading-5 text-ink">
        {{ props.hasFirst ? '再点白底右下角，不要点外面灰框' : '点白底网格左上角' }}
        <span class="ml-1 font-mono text-ink-3">{{ props.colCount }}×{{ props.rowCount }}</span>
      </p>
      <button type="button" class="shrink-0 text-[13px] font-medium text-ink-2" @click="emit('retry')">重来</button>
    </div>
  </section>
</template>
