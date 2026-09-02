import { onBeforeUnmount, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { capDpr, wheelFactor } from '@/engine/camera'
import { canvasToGrid, canvasToWorld, screenToCanvas, type CanvasRect } from '@/engine/coord'
import { PointerMachine } from '@/engine/input/pointerMachine'
import { Renderer } from '@/engine/renderer'
import { packCell } from '@/models/cellId'
import { gridFromCorners } from '@/models/grid'
import { useInteractionStore } from '@/stores/interaction'
import { useProgressStore } from '@/stores/progress'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useViewportStore } from '@/stores/viewport'

const WELL = '#d9d3c9'

export function useBeadCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const project = useProjectStore()
  const viewport = useViewportStore()
  const settings = useSettingsStore()
  const interaction = useInteractionStore()
  const progress = useProgressStore()
  const ui = useUiStore()
  const { scalePercent } = storeToRefs(viewport)

  let renderer: Renderer | null = null
  let observer: ResizeObserver | null = null
  let machine: PointerMachine | null = null
  let rect: CanvasRect = { left: 0, top: 0 }
  let dprQuery: MediaQueryList | null = null

  function world() {
    return project.worldSize
  }

  function readRect(canvas: HTMLCanvasElement): { cssWidth: number; cssHeight: number } {
    const box = canvas.getBoundingClientRect()
    rect = { left: box.left, top: box.top }
    return { cssWidth: box.width, cssHeight: box.height }
  }

  function syncBacking(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, dpr: number) {
    const width = Math.max(1, Math.round(cssWidth * dpr))
    const height = Math.max(1, Math.round(cssHeight * dpr))
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
  }

  function handleResize() {
    const canvas = canvasRef.value
    const size = world()
    if (!canvas) return
    const { cssWidth, cssHeight } = readRect(canvas)
    const dpr = capDpr(window.devicePixelRatio || 1)
    syncBacking(canvas, cssWidth, cssHeight, dpr)
    viewport.resize(cssWidth, cssHeight, dpr, size)
    renderer?.requestFrame()
  }

  function pointFromEvent(event: PointerEvent | WheelEvent) {
    return screenToCanvas({ screenX: event.clientX, screenY: event.clientY }, rect)
  }

  function attach(canvas: HTMLCanvasElement) {
    renderer = new Renderer(canvas, () => ({
      camera: viewport.camera,
      image: project.image?.bitmap
        ? {
            width: project.image.width,
            height: project.image.height,
            bitmap: project.image.bitmap,
          }
        : null,
      grid: project.gridMetrics,
      showGrid: settings.showGrid && project.gridCalibrated && !interaction.pinning,
      wellColor: WELL,
      focus: interaction.focus,
      countStart: interaction.countStart,
      countEnd: interaction.countEnd,
      countTotal: interaction.countResult?.total ?? null,
      showFocus: interaction.mode !== 'count' && project.gridCalibrated && !interaction.pinning,
      pinPoints: interaction.pinFirst ? [interaction.pinFirst] : [],
      completed: progress.completed,
    }))

    machine = new PointerMachine({
      panBy(dx, dy) {
        const size = world()
        if (!size) return
        viewport.panBy(dx, dy, size)
        renderer?.requestFrame()
      },
      zoomPinch(anchor, factor, followDx, followDy) {
        const size = world()
        if (!size) return
        viewport.zoomPinch(anchor, factor, followDx, followDy, size)
        renderer?.requestFrame()
      },
      tap(point) {
        if (interaction.pinning) {
          if (!interaction.pinReady || !project.image) return
          const world = canvasToWorld(point, viewport.camera)
          if (!interaction.pinFirst) {
            interaction.setPinFirst(world)
            renderer?.requestFrame()
            return
          }
          const spec = gridFromCorners(
            interaction.pinFirst,
            world,
            interaction.pinRows,
            interaction.pinCols,
            project.image.width,
            project.image.height,
          )
          if (!spec) {
            ui.toast('两点太近或太偏，再点一次', 'warn')
            interaction.clearPinFirst()
            renderer?.requestFrame()
            return
          }
          project.applyGrid(spec)
          interaction.endPin()
          settings.setShowGrid(true)
          ui.requestTune()
          ui.toast('可微调位置和格子大小', 'ok')
          renderer?.requestFrame()
          return
        }
        if (!project.gridCalibrated) return
        const grid = project.gridMetrics
        if (!grid) return
        const cell = canvasToGrid(point, viewport.camera, grid)
        if (!cell) return
        interaction.tapCell(cell)
        if (interaction.mode === 'complete') {
          progress.toggle(packCell(cell.row, cell.col, project.grid.colCount))
        }
        renderer?.requestFrame()
      },
      doubleTap() {
        fit()
      },
    })

    observer = new ResizeObserver(() => handleResize())
    observer.observe(canvas.parentElement ?? canvas)

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.style.touchAction = 'none'
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)

    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    dprQuery.addEventListener('change', handleResize)

    handleResize()
    renderer.requestFrame()
  }

  function detach(canvas: HTMLCanvasElement) {
    observer?.disconnect()
    observer = null
    renderer?.dispose()
    renderer = null
    machine = null
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerCancel)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', handleResize)
    window.visualViewport?.removeEventListener('resize', handleResize)
    dprQuery?.removeEventListener('change', handleResize)
    dprQuery = null
  }

  function onPointerDown(event: PointerEvent) {
    const canvas = canvasRef.value
    if (!canvas || !machine) return
    canvas.setPointerCapture(event.pointerId)
    readRect(canvas)
    machine.down(event.pointerId, pointFromEvent(event))
  }

  function onTouchMove(event: TouchEvent) {
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent) {
    machine?.move(event.pointerId, pointFromEvent(event))
  }

  function onPointerUp(event: PointerEvent) {
    const canvas = canvasRef.value
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    machine?.up(event.pointerId, pointFromEvent(event))
  }

  function onPointerCancel(event: PointerEvent) {
    machine?.cancel()
    const canvas = canvasRef.value
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    const canvas = canvasRef.value
    const size = world()
    if (!canvas || !size) return
    readRect(canvas)
    viewport.zoomAt(pointFromEvent(event), wheelFactor(event.deltaY), size)
    renderer?.requestFrame()
  }

  function onKey(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    const size = world()
    if (!size) return
    const center = { canvasX: viewport.cssWidth / 2, canvasY: viewport.cssHeight / 2 }
    const mod = event.ctrlKey || event.metaKey
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) progress.redo()
      else progress.undo()
      renderer?.requestFrame()
      return
    }
    if (mod && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      progress.redo()
      renderer?.requestFrame()
      return
    }
    if (event.key === '+' || event.key === '=') {
      viewport.zoomAt(center, 1.1, size)
      renderer?.requestFrame()
    } else if (event.key === '-' || event.key === '_') {
      viewport.zoomAt(center, 1 / 1.1, size)
      renderer?.requestFrame()
    } else if (event.key === '0') {
      fit()
    }
  }

  function fit() {
    const size = world()
    if (!size) return
    viewport.fit(size)
    renderer?.requestFrame()
  }

  function zoomBy(factor: number) {
    const size = world()
    if (!size) return
    viewport.zoomAt(
      { canvasX: viewport.cssWidth / 2, canvasY: viewport.cssHeight / 2 },
      factor,
      size,
    )
    renderer?.requestFrame()
  }

  async function ensureBitmap() {
    const image = project.image
    if (!image || image.bitmap) {
      renderer?.requestFrame()
      return
    }
    try {
      const response = await fetch(image.objectUrl)
      const blob = await response.blob()
      const bitmap = await createImageBitmap(blob)
      if (project.image?.objectUrl !== image.objectUrl) {
        bitmap.close()
        return
      }
      project.setBitmap(bitmap)
      renderer?.requestFrame()
    } catch {
      const fallback = new Image()
      fallback.decoding = 'async'
      fallback.src = image.objectUrl
      await fallback.decode()
      const bitmap = await createImageBitmap(fallback)
      if (project.image?.objectUrl !== image.objectUrl) {
        bitmap.close()
        return
      }
      project.setBitmap(bitmap)
      renderer?.requestFrame()
    }
  }

  watch(canvasRef, (canvas, prev) => {
    if (prev) detach(prev)
    if (canvas) attach(canvas)
  }, { immediate: true })

  watch(
    () => project.image?.objectUrl,
    (url, prev) => {
      const isInitial = prev === undefined
      if (!isInitial && prev !== url) {
        viewport.reset()
        interaction.clearFocus()
        interaction.clearCount()
        interaction.endPin()
        progress.reset()
      }
      handleResize()
      void ensureBitmap()
    },
    { immediate: true },
  )

  watch(
    () =>
      [
        project.grid.rowCount,
        project.grid.colCount,
        project.grid.insetLeft,
        project.grid.insetTop,
        project.grid.insetRight,
        project.grid.insetBottom,
        project.grid.calibrated,
      ] as const,
    (next, prev) => {
      interaction.clampToGrid(project.grid.rowCount, project.grid.colCount)
      if (prev && (next[0] !== prev[0] || next[1] !== prev[1])) {
        progress.reset()
      }
      const size = world()
      if (size && viewport.cssWidth > 0) {
        viewport.resize(viewport.cssWidth, viewport.cssHeight, viewport.dpr, size)
      }
      renderer?.requestFrame()
    },
  )

  watch(
    () => settings.showGrid,
    () => {
      renderer?.requestFrame()
    },
  )

  watch(
    () => [interaction.focus, interaction.countStart, interaction.countEnd, interaction.mode, interaction.pinFirst, interaction.pinning],
    () => {
      renderer?.requestFrame()
    },
  )

  watch(
    () => progress.doneCount,
    () => {
      renderer?.requestFrame()
    },
  )

  watch(
    () => [viewport.scale, viewport.offsetX, viewport.offsetY],
    () => {
      renderer?.requestFrame()
    },
  )

  onBeforeUnmount(() => {
    if (canvasRef.value) detach(canvasRef.value)
  })

  return {
    scalePercent,
    fit,
    zoomIn: () => zoomBy(1.1),
    zoomOut: () => zoomBy(1 / 1.1),
  }
}
