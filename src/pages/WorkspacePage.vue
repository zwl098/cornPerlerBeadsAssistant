<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { PhArrowLeft, PhArrowUUpLeft, PhArrowUUpRight, PhGridFour } from '@phosphor-icons/vue'
import BeadCanvas from '@/components/workspace/BeadCanvas.vue'
import GridSheet from '@/components/workspace/GridSheet.vue'
import MiniMap from '@/components/workspace/MiniMap.vue'
import StatusDock from '@/components/workspace/StatusDock.vue'
import ModeDock from '@/components/workspace/ModeDock.vue'
import ZoomControls from '@/components/workspace/ZoomControls.vue'
import { displayFormat } from '@/utils/file'
import { useProgressStore } from '@/stores/progress'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const project = useProjectStore()
const settings = useSettingsStore()
const progress = useProgressStore()
const { showGrid } = storeToRefs(settings)
const { canUndo, canRedo } = storeToRefs(progress)
const stage = ref<{
  fit: () => void
  zoomIn: () => void
  zoomOut: () => void
} | null>(null)

const gridOpen = ref(false)

function goHome() {
  void router.push('/')
}

function setRow(value: number) {
  project.setGridSize(value, project.grid.colCount)
}

function setCol(value: number) {
  project.setGridSize(project.grid.rowCount, value)
}
</script>

<template>
  <div class="flex h-dvh max-h-dvh flex-col overflow-hidden bg-workspace">
    <header
      class="flex min-h-12 shrink-0 items-center gap-1 border-b border-line/80 bg-surface/90 px-1 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:px-2"
    >
      <button
        type="button"
        class="inline-flex size-11 items-center justify-center rounded-lg text-ink"
        aria-label="返回首页"
        @click="goHome"
      >
        <PhArrowLeft :size="22" weight="regular" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-[17px] font-semibold leading-[22px] text-ink">{{ project.name }}</h1>
        <p class="truncate font-mono text-[12px] leading-4 text-ink-3">
          <template v-if="project.image">
            {{ displayFormat(project.image.mime, project.image.originalName) }}
          </template>
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-medium md:px-3"
        :class="canUndo ? 'text-ink' : 'pointer-events-none text-ink-3 opacity-40'"
        :disabled="!canUndo"
        aria-label="撤销"
        @click="progress.undo()"
      >
        <PhArrowUUpLeft :size="18" weight="regular" />
        <span class="hidden md:inline">撤销</span>
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-medium md:px-3"
        :class="canRedo ? 'text-ink' : 'pointer-events-none text-ink-3 opacity-40'"
        :disabled="!canRedo"
        aria-label="重做"
        @click="progress.redo()"
      >
        <PhArrowUUpRight :size="18" weight="regular" />
        <span class="hidden md:inline">重做</span>
      </button>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-ink"
        @click="gridOpen = true"
      >
        <PhGridFour :size="18" weight="regular" />
        {{ project.grid.colCount }}×{{ project.grid.rowCount }}
      </button>
    </header>

    <StatusDock />

    <main class="relative min-h-0 flex-1 p-3">
      <div class="size-full min-h-0 overflow-hidden rounded-xl bg-well">
        <BeadCanvas ref="stage" />
      </div>
      <MiniMap />
      <ZoomControls @in="stage?.zoomIn()" @out="stage?.zoomOut()" @fit="stage?.fit()" />
    </main>

    <ModeDock />

    <GridSheet
      :open="gridOpen"
      :row-count="project.grid.rowCount"
      :col-count="project.grid.colCount"
      :show-grid="showGrid"
      @close="gridOpen = false"
      @update:row-count="setRow"
      @update:col-count="setCol"
      @update:show-grid="settings.setShowGrid"
    />
  </div>
</template>
