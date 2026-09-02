import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { ImageAsset } from '@/models/types'
import { useInteractionStore } from '@/stores/interaction'
import { useProgressStore } from '@/stores/progress'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useViewportStore } from '@/stores/viewport'
import {
  ACCEPT_ATTR,
  decodeImageFile,
  inspectFile,
  isDimensionError,
  nameFromFile,
} from '@/utils/file'

export function useImageUpload() {
  const project = useProjectStore()
  const progress = useProgressStore()
  const viewport = useViewportStore()
  const interaction = useInteractionStore()
  const settings = useSettingsStore()
  const ui = useUiStore()
  const { hasImage } = storeToRefs(project)
  const busy = ref(false)
  const inputId = 'bead-file-input'

  function openPicker() {
    const input = document.getElementById(inputId) as HTMLInputElement | null
    input?.click()
  }

  async function handleFiles(fileList: FileList | File[] | null) {
    const file = fileList?.[0]
    if (!file || busy.value) return

    const check = inspectFile(file)
    if (!check.ok) {
      if (check.code === 'size') {
        ui.openOversizeModal(check.message)
        return
      }
      ui.toast(check.message, 'danger')
      return
    }

    busy.value = true
    try {
      const decoded = await decodeImageFile(file, check.mime)
      const image: ImageAsset = {
        mime: decoded.mime,
        width: decoded.width,
        height: decoded.height,
        objectUrl: decoded.objectUrl,
        fileSize: file.size,
        originalName: file.name,
        bitmap: null,
      }
      project.setImage(nameFromFile(file.name), image)
      progress.reset()
      viewport.reset()
      interaction.setMode('select')
      interaction.clearFocus()
      interaction.clearCount()
      interaction.endPin()
      settings.setShowGrid(project.gridCalibrated)
    } catch (error) {
      if (isDimensionError(error)) {
        ui.openOversizeModal('这张图边长超过 8000 像素，换一张小一点的')
      } else {
        ui.toast('这张图打不开', 'danger')
      }
    } finally {
      busy.value = false
      const input = document.getElementById(inputId) as HTMLInputElement | null
      if (input) input.value = ''
    }
  }

  return {
    busy,
    hasImage,
    inputId,
    accept: ACCEPT_ATTR,
    openPicker,
    handleFiles,
  }
}
