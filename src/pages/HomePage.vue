<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import BeadMark from '@/components/home/BeadMark.vue'
import HeroCTA from '@/components/home/HeroCTA.vue'
import PreviewCard from '@/components/home/PreviewCard.vue'
import RecentRail from '@/components/home/RecentRail.vue'
import { useImageUpload } from '@/composables/useImageUpload'
import { RECENT_LIMIT } from '@/persist/constants'
import { loadProject } from '@/persist/hydrate'
import { getImage, listRecent } from '@/persist/projectRepo'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'

type RecentItem = {
  id: string
  name: string
  src: string
  width: number
  height: number
}

const router = useRouter()
const project = useProjectStore()
const ui = useUiStore()
const { reselectToken } = storeToRefs(ui)
const { busy, hasImage, inputId, accept, openPicker, handleFiles } = useImageUpload()

const dragging = ref(false)
const recents = ref<RecentItem[]>([])
let dragDepth = 0
const recentUrls: string[] = []

const preview = computed(() => {
  if (!project.image) return null
  return {
    name: project.name,
    src: project.image.objectUrl,
    width: project.image.width,
    height: project.image.height,
    mime: project.image.mime,
    originalName: project.image.originalName,
  }
})

function onDragEnter(event: DragEvent) {
  event.preventDefault()
  dragDepth += 1
  dragging.value = true
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(event: DragEvent) {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragDepth = 0
  dragging.value = false
  void handleFiles(event.dataTransfer?.files ?? null)
}

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  void handleFiles(input.files)
}

function enterWorkspace() {
  void router.push('/w')
}

async function refreshRecents() {
  for (const url of recentUrls) URL.revokeObjectURL(url)
  recentUrls.length = 0
  try {
    const list = await listRecent(RECENT_LIMIT + 1)
    const others = list.filter((item) => item.id !== project.projectId).slice(0, RECENT_LIMIT)
    recents.value = await Promise.all(
      others.map(async (item) => {
        const image = await getImage(item.id)
        const src = image?.blob ? URL.createObjectURL(image.blob) : ''
        if (src) recentUrls.push(src)
        return {
          id: item.id,
          name: item.name,
          src,
          width: item.width,
          height: item.height,
        }
      }),
    )
  } catch {
    recents.value = []
  }
}

async function openRecent(id: string) {
  const ok = await loadProject(id)
  if (!ok) {
    ui.toast('这张图纸打不开了', 'danger')
    return
  }
  void router.push('/w')
}

onMounted(() => {
  void refreshRecents()
})

onUnmounted(() => {
  for (const url of recentUrls) URL.revokeObjectURL(url)
  recentUrls.length = 0
})

watch(() => project.projectId, () => {
  void refreshRecents()
})

watch(reselectToken, (token) => {
  if (token > 0) openPicker()
})
</script>

<template>
  <main
    class="relative min-h-dvh bg-bg px-5 pb-12 pt-[max(20px,env(safe-area-inset-top))] md:px-10"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="mx-auto flex w-full max-w-[960px] flex-col gap-8 md:gap-12 md:pt-16">
      <header class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <BeadMark />
          <div>
            <p class="text-[15px] font-semibold leading-5 text-ink">拼豆助手</p>
            <p class="hidden text-[12px] text-ink-3 md:block">Perler Beads Assistant</p>
          </div>
        </div>
        <p class="hidden text-[12px] text-ink-3 md:block">本机存储，无需登录</p>
      </header>

      <section class="flex flex-col gap-4 md:max-w-[560px]">
        <h1 class="text-[28px] font-semibold leading-[34px] tracking-tight text-ink md:text-[40px] md:leading-[46px]">
          不再数错格
        </h1>
        <p class="text-[15px] leading-[22px] text-ink-2">看图摆豆时，帮你对准格子。</p>
        <HeroCTA :busy="busy" @upload="openPicker" />
      </section>

      <PreviewCard
        v-if="preview && hasImage"
        :key="preview.src"
        :name="preview.name"
        :src="preview.src"
        :width="preview.width"
        :height="preview.height"
        :mime="preview.mime"
        :original-name="preview.originalName"
        @update:name="project.rename($event)"
        @enter="enterWorkspace"
        @replace="openPicker"
      />

      <RecentRail :items="recents" @open="openRecent" />

      <p class="text-[13px] tracking-wide text-ink-3">看得清 · 数得准 · 找得到</p>
    </div>

    <input
      :id="inputId"
      class="sr-only"
      type="file"
      :accept="accept"
      @change="onInput"
    />

    <div
      v-if="dragging"
      class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-brand/12"
    >
      <p class="rounded-xl bg-surface px-5 py-3 text-[15px] font-medium text-ink shadow-[0_8px_24px_rgba(43,36,32,0.08)]">
        放开即可打开图纸
      </p>
    </div>
  </main>
</template>
