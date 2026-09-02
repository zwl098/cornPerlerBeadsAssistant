import { onBeforeUnmount, watch, type Ref } from 'vue'
import { capDpr, fitWorldCamera } from '@/engine/camera'
import {
  canvasToWorld,
  gridToWorldCenter,
  screenToCanvas,
  visibleWorldRect,
  worldRectToCanvas,
  type CanvasRect,
} from '@/engine/coord'
import { TAP_SLOP } from '@/engine/input/pointerMachine'
import { MiniMapRenderer } from '@/engine/minimapRenderer'
import { useInteractionStore } from '@/stores/interaction'
import { useProjectStore } from '@/stores/project'
import { useViewportStore } from '@/stores/viewport'
import type { CanvasPt, ViewportState } from '@/models/types'
import { hypot } from '@/utils/math'

const FRAME_HIT_PAD = 8

export function useMiniMap(canvasRef: Ref<HTMLCanvasElement | null>) {
  const project = useProjectStore()
  const viewport = useViewportStore()
  const interaction = useInteractionStore()

  let renderer: MiniMapRenderer | null = null
  let observer: ResizeObserver | null = null
  let rect: CanvasRect = { left: 0, top: 0 }
  let miniCam: ViewportState | null = null
  let dragging = false
  let last: CanvasPt | null = null
  let start: CanvasPt | null = null
  let moved = false

  function world() {
    return project.worldSize
  }

  function readRect(canvas: HTMLCanvasElement) {
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

  function rebuildCam(cssWidth: number, cssHeight: number, dpr: number) {
    const size = world()
    if (!size || cssWidth <= 0 || cssHeight <= 0) {
      miniCam = null
      return
    }
    miniCam = fitWorldCamera(cssWidth, cssHeight, size.width, size.height, dpr)
  }

  function handleResize() {
    const canvas = canvasRef.value
    if (!canvas) return
    const { cssWidth, cssHeight } = readRect(canvas)
    const dpr = capDpr(window.devicePixelRatio || 1)
    syncBacking(canvas, cssWidth, cssHeight, dpr)
    rebuildCam(cssWidth, cssHeight, dpr)
    renderer?.requestFrame()
  }

  function pointFromEvent(event: PointerEvent): CanvasPt {
    return screenToCanvas({ screenX: event.clientX, screenY: event.clientY }, rect)
  }

  function hitViewFrame(point: CanvasPt): boolean {
    if (!miniCam) return false
    const box = worldRectToCanvas(visibleWorldRect(viewport.camera), miniCam)
    return (
      point.canvasX >= box.x - FRAME_HIT_PAD &&
      point.canvasX <= box.x + box.w + FRAME_HIT_PAD &&
      point.canvasY >= box.y - FRAME_HIT_PAD &&
      point.canvasY <= box.y + box.h + FRAME_HIT_PAD
    )
  }

  function attach(canvas: HTMLCanvasElement) {
    renderer = new MiniMapRenderer(canvas, () => {
      const grid = project.gridMetrics
      const focus = interaction.focus
      return {
        miniCam: miniCam ?? {
          scale: 1,
          minScale: 1,
          maxScale: 1,
          offsetX: 0,
          offsetY: 0,
          cssWidth: 0,
          cssHeight: 0,
          dpr: 1,
        },
        mainCam: viewport.camera,
        image: project.image?.bitmap
          ? {
              width: project.image.width,
              height: project.image.height,
              bitmap: project.image.bitmap,
            }
          : null,
        focusWorld: focus && grid ? gridToWorldCenter(focus, grid) : null,
      }
    })

    observer = new ResizeObserver(() => handleResize())
    observer.observe(canvas)

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.style.touchAction = 'none'
    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)

    handleResize()
    renderer.requestFrame()
  }

  function detach(canvas: HTMLCanvasElement) {
    observer?.disconnect()
    observer = null
    renderer?.dispose()
    renderer = null
    miniCam = null
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerCancel)
    canvas.removeEventListener('wheel', onWheel)
    window.removeEventListener('resize', handleResize)
    window.visualViewport?.removeEventListener('resize', handleResize)
  }

  function onPointerDown(event: PointerEvent) {
    const canvas = canvasRef.value
    if (!canvas || !miniCam) return
    event.preventDefault()
    event.stopPropagation()
    canvas.setPointerCapture(event.pointerId)
    readRect(canvas)
    const point = pointFromEvent(event)
    start = point
    last = point
    moved = false
    dragging = hitViewFrame(point)
  }

  function onPointerMove(event: PointerEvent) {
    if (!start || !last || !miniCam) return
    const size = world()
    if (!size) return
    const point = pointFromEvent(event)
    if (!moved && hypot(point.canvasX - start.canvasX, point.canvasY - start.canvasY) > TAP_SLOP) {
      moved = true
    }
    if (dragging && moved) {
      const from = canvasToWorld(last, miniCam)
      const to = canvasToWorld(point, miniCam)
      viewport.panWorld(to.worldX - from.worldX, to.worldY - from.worldY, size)
      renderer?.requestFrame()
    }
    last = point
  }

  function onPointerUp(event: PointerEvent) {
    const canvas = canvasRef.value
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    const size = world()
    if (!moved && miniCam && size && start) {
      viewport.centerOnWorld(canvasToWorld(start, miniCam), size)
      renderer?.requestFrame()
    }
    dragging = false
    last = null
    start = null
    moved = false
  }

  function onPointerCancel(event: PointerEvent) {
    const canvas = canvasRef.value
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    dragging = false
    last = null
    start = null
    moved = false
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
  }

  watch(canvasRef, (canvas, prev) => {
    if (prev) detach(prev)
    if (canvas) attach(canvas)
  }, { immediate: true })

  watch(
    () => [
      viewport.scale,
      viewport.offsetX,
      viewport.offsetY,
      viewport.cssWidth,
      viewport.cssHeight,
      interaction.focus,
      project.image?.bitmap,
      project.grid.rowCount,
      project.grid.colCount,
    ],
    () => {
      renderer?.requestFrame()
    },
  )

  watch(
    () => project.image?.objectUrl,
    () => {
      handleResize()
    },
  )

  onBeforeUnmount(() => {
    if (canvasRef.value) detach(canvasRef.value)
  })
}
