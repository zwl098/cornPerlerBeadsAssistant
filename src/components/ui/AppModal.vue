<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const { modal } = storeToRefs(ui)

function onMask() {
  ui.closeModal()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modal.open"
      class="fixed inset-0 z-40 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'oversize-title'"
    >
      <button
        type="button"
        class="absolute inset-0 bg-ink/45"
        aria-label="关闭"
        @click="onMask"
      />
      <div class="relative w-full max-w-[360px] rounded-2xl bg-surface p-5 shadow-[0_16px_40px_rgba(43,36,32,0.16)]">
        <h2 id="oversize-title" class="text-[17px] font-semibold leading-[22px] text-ink">
          {{ modal.title }}
        </h2>
        <p class="mt-2 text-[15px] leading-[22px] text-ink-2">{{ modal.body }}</p>
        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            class="h-11 min-h-11 rounded-lg px-4 text-[15px] font-medium text-ink-2"
            @click="ui.closeModal()"
          >
            取消
          </button>
          <button
            type="button"
            class="h-11 min-h-11 rounded-lg bg-brand px-4 text-[15px] font-semibold text-white"
            @click="ui.requestReselect()"
          >
            重选
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
