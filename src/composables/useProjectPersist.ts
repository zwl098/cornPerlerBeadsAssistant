import { onBeforeUnmount, watch } from 'vue'
import { useInteractionStore } from '@/stores/interaction'
import { useProgressStore } from '@/stores/progress'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useViewportStore } from '@/stores/viewport'
import { SAVE_DEBOUNCE_MS } from '@/persist/constants'
import { isApplyingRemote } from '@/persist/hydrate'
import { putCells, putImage, putProject } from '@/persist/projectRepo'
import { saveLastProjectId, saveSettings } from '@/persist/settingsRepo'
import type { ProjectRecord } from '@/persist/types'
import { cameraToView, encodeCompleted } from '@/persist/view'

export function useProjectPersist() {
  const project = useProjectStore()
  const progress = useProgressStore()
  const settings = useSettingsStore()
  const viewport = useViewportStore()
  const interaction = useInteractionStore()
  const ui = useUiStore()

  let timer = 0
  let flushing = false
  let queued = false
  let dirtyMeta = false
  let dirtyCells = false
  let dirtyImage = false
  let lastView = viewport.pendingView ?? cameraToView(viewport.camera)
  let warned = false

  function markMeta() {
    if (isApplyingRemote() || !project.image) return
    dirtyMeta = true
    schedule()
  }

  function markCells() {
    if (isApplyingRemote() || !project.image) return
    dirtyCells = true
    dirtyMeta = true
    schedule()
  }

  function markImage() {
    if (isApplyingRemote() || !project.image) return
    dirtyImage = true
    dirtyCells = true
    dirtyMeta = true
    void flushNow()
  }

  function schedule() {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = 0
      void flushNow()
    }, SAVE_DEBOUNCE_MS)
  }

  async function flushNow() {
    if (isApplyingRemote() || !project.image || project.projectId === 'draft') return
    if (flushing) {
      queued = true
      return
    }
    if (timer) {
      window.clearTimeout(timer)
      timer = 0
    }

    const wantImage = dirtyImage
    const wantCells = dirtyCells
    const wantMeta = dirtyMeta
    if (!wantImage && !wantCells && !wantMeta) return

    dirtyImage = false
    dirtyCells = false
    dirtyMeta = false
    flushing = true

    const id = project.projectId
    const image = project.image
    const view = cameraToView(viewport.camera) ?? viewport.pendingView ?? lastView
    if (view) lastView = view

    const meta: ProjectRecord = {
      id,
      name: project.name,
      width: image.width,
      height: image.height,
      mime: image.mime,
      originalName: image.originalName,
      fileSize: image.fileSize,
      grid: { ...project.grid },
      view,
      focus: interaction.focus ? { ...interaction.focus } : null,
      showGrid: settings.showGrid,
      createdAt: project.createdAt,
      lastUsedAt: Date.now(),
    }
    const cells = wantCells ? encodeCompleted(progress.completed) : null

    try {
      if (wantImage) {
        const blob = await fetch(image.objectUrl).then((res) => res.blob())
        if (project.projectId !== id) return
        await putImage({
          id,
          blob,
          mime: image.mime,
          width: image.width,
          height: image.height,
          originalName: image.originalName,
          fileSize: image.fileSize,
        })
      }
      if (project.projectId !== id) return
      if (wantCells && cells) await putCells(id, cells)
      if (wantMeta) {
        await putProject(meta)
        saveLastProjectId(id)
      }
    } catch {
      dirtyImage = dirtyImage || wantImage
      dirtyCells = dirtyCells || wantCells
      dirtyMeta = dirtyMeta || wantMeta
      if (!warned) {
        warned = true
        ui.toast('进度没存上，先别关页面', 'warn')
      }
    } finally {
      flushing = false
      if (queued || dirtyImage || dirtyCells || dirtyMeta) {
        queued = false
        void flushNow()
      }
    }
  }

  watch(
    () => project.projectId,
    (id, prev) => {
      if (prev !== undefined && id !== prev) {
        lastView = null
        markImage()
      }
    },
  )

  watch(
    () => [project.grid.rowCount, project.grid.colCount] as const,
    (next, prev) => {
      if (isApplyingRemote()) return
      if (prev && (next[0] !== prev[0] || next[1] !== prev[1])) {
        progress.reset()
        dirtyCells = true
        dirtyMeta = true
        void flushNow()
      }
    },
  )

  watch(() => project.name, markMeta)
  watch(
    () =>
      [
        project.grid.insetLeft,
        project.grid.insetTop,
        project.grid.insetRight,
        project.grid.insetBottom,
        project.grid.calibrated,
      ] as const,
    markMeta,
  )
  watch(() => [viewport.scale, viewport.offsetX, viewport.offsetY], markMeta)
  watch(() => interaction.focus, markMeta, { deep: true })
  watch(() => progress.completed, markCells)

  watch(
    () => settings.showGrid,
    (show) => {
      saveSettings({ showGrid: show })
      markMeta()
    },
  )

  function onHide() {
    void flushNow()
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') void flushNow()
  }

  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', onVisibility)

  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', onHide)
    document.removeEventListener('visibilitychange', onVisibility)
    void flushNow()
  })
}
