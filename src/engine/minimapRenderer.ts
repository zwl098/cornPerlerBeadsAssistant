import { applyCamera, resetCamera } from './camera'
import { visibleWorldRect, worldRectToCanvas, worldToCanvas } from './coord'
import type { EngineImage } from './layers/types'
import type { ViewportState, WorldPt } from '../models/types'

const WELL = '#d9d3c9'
const FRAME_FILL = 'rgba(227, 107, 76, 0.16)'
const FRAME_STROKE = '#E36B4C'
const FOCUS_FILL = '#E36B4C'
const BORDER = 'rgba(26, 26, 26, 0.22)'

export type MiniMapSnapshot = {
  miniCam: ViewportState
  mainCam: ViewportState
  image: EngineImage | null
  focusWorld: WorldPt | null
}

export class MiniMapRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private scheduled = false
  private frame = 0
  snapshot: () => MiniMapSnapshot

  constructor(canvas: HTMLCanvasElement, snapshot: () => MiniMapSnapshot) {
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.canvas = canvas
    this.ctx = ctx
    this.snapshot = snapshot
  }

  requestFrame(): void {
    if (this.scheduled) return
    this.scheduled = true
    this.frame = requestAnimationFrame(() => {
      this.scheduled = false
      this.flush()
    })
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    this.scheduled = false
  }

  private flush(): void {
    const snap = this.snapshot()
    const { miniCam } = snap
    if (miniCam.cssWidth <= 0 || miniCam.cssHeight <= 0) return

    const backingWidth = this.canvas.width
    const backingHeight = this.canvas.height
    if (backingWidth <= 0 || backingHeight <= 0) return

    resetCamera(this.ctx)
    this.ctx.fillStyle = WELL
    this.ctx.fillRect(0, 0, backingWidth, backingHeight)

    if (!snap.image) return

    applyCamera(this.ctx, miniCam, backingWidth, backingHeight)
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'low'
    this.ctx.drawImage(snap.image.bitmap, 0, 0, snap.image.width, snap.image.height)
    this.ctx.strokeStyle = BORDER
    this.ctx.lineWidth = 1 / miniCam.scale
    this.ctx.strokeRect(0, 0, snap.image.width, snap.image.height)

    resetCamera(this.ctx)
    const sx = backingWidth / miniCam.cssWidth
    const sy = backingHeight / miniCam.cssHeight
    this.ctx.setTransform(sx, 0, 0, sy, 0, 0)

    const vis = visibleWorldRect(snap.mainCam)
    const box = worldRectToCanvas(vis, miniCam)
    this.ctx.fillStyle = FRAME_FILL
    this.ctx.fillRect(box.x, box.y, box.w, box.h)
    this.ctx.strokeStyle = FRAME_STROKE
    this.ctx.lineWidth = 1.5
    this.ctx.strokeRect(box.x, box.y, box.w, box.h)

    if (!snap.focusWorld) return
    const mark = worldToCanvas(snap.focusWorld, miniCam)
    this.ctx.fillStyle = FOCUS_FILL
    this.ctx.beginPath()
    this.ctx.arc(mark.canvasX, mark.canvasY, 3, 0, Math.PI * 2)
    this.ctx.fill()
  }
}
