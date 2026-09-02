<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { PhArrowRight, PhImage } from '@phosphor-icons/vue'
import { displayFormat } from '@/utils/file'

const props = defineProps<{
  name: string
  src: string
  width: number
  height: number
  mime: string
  originalName: string
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  enter: []
  replace: []
}>()

const editing = ref(false)
const draft = ref(props.name)
const nameInput = ref<HTMLInputElement | null>(null)

const meta = computed(
  () => `${props.width} × ${props.height} · ${displayFormat(props.mime, props.originalName)}`,
)

async function startEdit() {
  draft.value = props.name
  editing.value = true
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}

function commit() {
  editing.value = false
  emit('update:name', draft.value)
}
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_rgba(43,36,32,0.06)]"
    aria-label="图纸预览"
  >
    <div class="relative aspect-[4/3] bg-well">
      <img
        :src="props.src"
        :alt="props.name"
        class="absolute inset-0 size-full object-contain"
        style="image-rendering: pixelated"
      />
    </div>
    <div class="flex flex-col gap-3 p-4">
      <label v-if="editing" class="block">
        <span class="sr-only">图纸名称</span>
        <input
          ref="nameInput"
          v-model="draft"
          maxlength="40"
          class="h-11 w-full rounded-lg border border-brand bg-surface px-3 text-[17px] font-semibold text-ink outline-none"
          @blur="commit"
          @keyup.enter="commit"
        />
      </label>
      <button
        v-else
        type="button"
        class="min-h-11 rounded-lg px-1 text-left text-[17px] font-semibold leading-[22px] text-ink"
        @click="startEdit"
      >
        {{ props.name }}
      </button>
      <p class="font-mono text-[12px] leading-4 text-ink-2">{{ meta }}</p>
      <button
        type="button"
        class="inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-brand-pressed"
        @click="emit('enter')"
      >
        进入工作区
        <PhArrowRight :size="18" weight="regular" />
      </button>
      <button
        type="button"
        class="inline-flex h-11 min-h-11 items-center justify-center gap-2 text-[14px] font-medium text-ink-2"
        @click="emit('replace')"
      >
        <PhImage :size="16" weight="regular" />
        换一张
      </button>
    </div>
  </section>
</template>
