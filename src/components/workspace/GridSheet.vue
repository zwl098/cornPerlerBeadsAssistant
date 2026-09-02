<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GRID_PRESETS, MAX_GRID_COUNT } from '@/models/types'

const STEPS = [1, 8] as const

const props = defineProps<{
  open: boolean
  rowCount: number
  colCount: number
  showGrid: boolean
}>()

const emit = defineEmits<{
  close: []
  repin: []
  shift: [dx: number, dy: number]
  grow: [delta: number]
  'update:rowCount': [value: number]
  'update:colCount': [value: number]
  'update:showGrid': [value: boolean]
}>()

const rowText = ref(String(props.rowCount))
const colText = ref(String(props.colCount))
const step = ref<(typeof STEPS)[number]>(1)

watch(
  () => [props.rowCount, props.colCount, props.open],
  () => {
    rowText.value = String(props.rowCount)
    colText.value = String(props.colCount)
  },
)

const valid = computed(() => {
  const row = Number(rowText.value)
  const col = Number(colText.value)
  return Number.isInteger(row) && Number.isInteger(col) && row >= 1 && col >= 1 && row <= MAX_GRID_COUNT && col <= MAX_GRID_COUNT
})

function commit() {
  if (!valid.value) return
  emit('update:rowCount', Number(rowText.value))
  emit('update:colCount', Number(colText.value))
}

function applyPreset(row: number, col: number) {
  rowText.value = String(row)
  colText.value = String(col)
  emit('update:rowCount', row)
  emit('update:colCount', col)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="pointer-events-none fixed inset-0 z-30">
      <section
        class="pointer-events-auto absolute inset-x-0 bottom-0 max-h-[48vh] overflow-y-auto rounded-t-2xl bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(43,36,32,0.12)] md:inset-x-auto md:bottom-8 md:left-1/2 md:w-[400px] md:-translate-x-1/2 md:rounded-2xl"
      >
        <div class="mx-auto mb-3 h-1 w-8 rounded-full bg-line md:hidden" />
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-[17px] font-semibold text-ink">微调网格</h2>
          <button type="button" class="text-[14px] font-medium text-brand" @click="emit('close')">完成</button>
        </header>

        <p class="mb-3 text-[13px] leading-[18px] text-ink-2">对照图纸挪位置、改格子大小。行列不变。</p>

        <label class="mb-3 flex items-center justify-between gap-3 text-[15px] text-ink">
          显示网格
          <input
            :checked="props.showGrid"
            type="checkbox"
            class="size-5 accent-brand"
            @change="emit('update:showGrid', ($event.target as HTMLInputElement).checked)"
          />
        </label>

        <div class="mb-3 flex items-center justify-between">
          <span class="text-[12px] text-ink-3">步长</span>
          <div class="flex gap-1">
            <button
              v-for="value in STEPS"
              :key="value"
              type="button"
              class="h-8 rounded-md px-3 font-mono text-[13px]"
              :class="step === value ? 'bg-brand-soft text-brand' : 'bg-workspace text-ink-2'"
              @click="step = value"
            >
              {{ value }}px
            </button>
          </div>
        </div>

        <p class="mb-1 text-[12px] text-ink-3">移动</p>
        <div class="mb-3 grid grid-cols-4 gap-2">
          <button type="button" class="h-10 rounded-lg bg-workspace text-[13px] text-ink" @click="emit('shift', -step, 0)">左</button>
          <button type="button" class="h-10 rounded-lg bg-workspace text-[13px] text-ink" @click="emit('shift', step, 0)">右</button>
          <button type="button" class="h-10 rounded-lg bg-workspace text-[13px] text-ink" @click="emit('shift', 0, -step)">上</button>
          <button type="button" class="h-10 rounded-lg bg-workspace text-[13px] text-ink" @click="emit('shift', 0, step)">下</button>
        </div>

        <p class="mb-1 text-[12px] text-ink-3">格子大小</p>
        <div class="mb-4 grid grid-cols-2 gap-2">
          <button type="button" class="h-10 rounded-lg bg-workspace text-[13px] text-ink" @click="emit('grow', -step)">变小</button>
          <button type="button" class="h-10 rounded-lg bg-workspace text-[13px] text-ink" @click="emit('grow', step)">变大</button>
        </div>

        <button
          type="button"
          class="mb-4 flex h-11 w-full items-center justify-center rounded-lg bg-brand-soft text-[15px] font-medium text-brand"
          @click="emit('repin')"
        >
          重新钉格
        </button>

        <div class="mb-3 grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-[12px] text-ink-3">行</span>
            <input
              v-model="rowText"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-line bg-surface px-3 font-mono text-[15px] outline-none focus:border-brand"
              @change="commit"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[12px] text-ink-3">列</span>
            <input
              v-model="colText"
              inputmode="numeric"
              class="h-11 w-full rounded-lg border border-line bg-surface px-3 font-mono text-[15px] outline-none focus:border-brand"
              @change="commit"
            />
          </label>
        </div>
        <p v-if="!valid" class="mb-3 text-[12px] text-danger">行列需为 1 到 {{ MAX_GRID_COUNT }} 的整数</p>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in GRID_PRESETS"
            :key="preset.label"
            type="button"
            class="h-9 rounded-lg px-3 font-mono text-[13px]"
            :class="
              props.rowCount === preset.rowCount && props.colCount === preset.colCount
                ? 'bg-brand-soft text-brand'
                : 'bg-workspace text-ink-2'
            "
            @click="applyPreset(preset.rowCount, preset.colCount)"
          >
            {{ preset.label }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
