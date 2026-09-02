<script setup lang="ts">
const props = defineProps<{
  items: Array<{
    id: string
    name: string
    src: string
    width: number
    height: number
  }>
}>()

const emit = defineEmits<{
  open: [id: string]
}>()
</script>

<template>
  <section v-if="props.items.length" class="flex flex-col gap-3">
    <h2 class="text-[13px] font-medium text-ink-2">最近使用</h2>
    <div class="flex gap-3 overflow-x-auto pb-1">
      <button
        v-for="item in props.items"
        :key="item.id"
        type="button"
        class="w-[140px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface text-left shadow-[0_8px_24px_rgba(43,36,32,0.04)]"
        @click="emit('open', item.id)"
      >
        <div class="relative aspect-[4/3] bg-well">
          <img
            v-if="item.src"
            :src="item.src"
            :alt="item.name"
            class="absolute inset-0 size-full object-contain"
            style="image-rendering: pixelated"
          />
        </div>
        <div class="px-2.5 py-2">
          <p class="truncate text-[13px] font-medium text-ink">{{ item.name }}</p>
          <p class="font-mono text-[11px] text-ink-3">{{ item.width }} × {{ item.height }}</p>
        </div>
      </button>
    </div>
  </section>
</template>
