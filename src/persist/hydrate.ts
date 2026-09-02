import { nextTick } from 'vue'
import { useInteractionStore } from '@/stores/interaction'
import { useProgressStore } from '@/stores/progress'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useViewportStore } from '@/stores/viewport'
import { getCells, getImage, getProject, listRecent, touchLastUsed } from './projectRepo'
import { loadLastProjectId, loadSettings, saveLastProjectId } from './settingsRepo'
import { decodeCompleted } from './view'

let applyingRemote = false

export function isApplyingRemote(): boolean {
  return applyingRemote
}

export async function hydrateApp(): Promise<void> {
  const settings = useSettingsStore()
  const stored = loadSettings()
  settings.setShowGrid(stored.showGrid)

  const lastId = loadLastProjectId()
  if (lastId) {
    const ok = await loadProject(lastId)
    if (ok) return
  }
  const recent = await listRecent(1)
  const fallback = recent[0]
  if (fallback) await loadProject(fallback.id)
}

export async function loadProject(id: string): Promise<boolean> {
  const project = useProjectStore()
  const progress = useProgressStore()
  const settings = useSettingsStore()
  const viewport = useViewportStore()
  const interaction = useInteractionStore()

  const record = await getProject(id)
  const image = await getImage(id)
  if (!record || !image?.blob) return false

  const cells = await getCells(id)
  applyingRemote = true
  try {
    const objectUrl = URL.createObjectURL(image.blob)
    project.restore({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      grid: record.grid,
      image: {
        mime: image.mime,
        width: image.width,
        height: image.height,
        objectUrl,
        fileSize: image.fileSize,
        originalName: image.originalName,
        bitmap: null,
      },
    })
    progress.replaceAll(decodeCompleted(cells))
    settings.setShowGrid(record.showGrid)
    viewport.reset()
    viewport.restoreView(record.view)
    interaction.setMode('select')
    interaction.clearCount()
    if (record.focus) interaction.setFocus(record.focus)
    else interaction.clearFocus()
    saveLastProjectId(id)
    await touchLastUsed(id)
    await nextTick()
  } finally {
    applyingRemote = false
  }
  return true
}
