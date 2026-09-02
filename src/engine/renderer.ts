import { applyCamera, resetCamera } from '@/engine/camera'
import { visibleWorldRect } from '@/engine/coord'
import { CompletedLayer } from '@/engine/layers/CompletedLayer'
import { CountLayer } from '@/engine/layers/CountLayer'
import { GridLayer } from '@/engine/layers/GridLayer'
import { HighlightLayer } from '@/engine/layers/HighlightLayer'
import { ImageLayer } from '@/engine/layers/ImageLayer'
import type { EngineImage, LayerContext } from '@/engine/layers/types'
import type { CellId } from '@/models/cellId'
import type { GridCell, GridMetrics, ViewportState } from '@/models/types'

export type DrawSnapshot = {
  camera: ViewportState
  image: EngineImage | null
  grid: GridMetrics | null
  showGrid: boolean
  wellColor: string
  focus: GridCell | null
  countStart: GridCell | null
  countEnd: GridCell | null
  countTotal: number | null
  showFocus: boolean
  completed: ReadonlySet<CellId>
}

const WELL_FALLBACK = '#d9d3c9'

export class Renderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private scheduled = false
  private frame = 0
  private readonly imageLayer = new ImageLayer()
  private readonly gridLayer = new GridLayer()
  private readonly completedLayer = new CompletedLayer()
  private readonly highlightLayer = new HighlightLayer()
  private readonly countLayer = new CountLayer()
  snapshot: () => DrawSnapshot

  constructor(canvas: HTMLCanvasElement, snapshot: () => DrawSnapshot) {
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
    const { camera } = snap
    if (camera.cssWidth <= 0 || camera.cssHeight <= 0) return

    const backingWidth = this.canvas.width
    const backingHeight = this.canvas.height
    if (backingWidth <= 0 || backingHeight <= 0) return

    resetCamera(this.ctx)
    this.ctx.fillStyle = snap.wellColor || WELL_FALLBACK
    this.ctx.fillRect(0, 0, backingWidth, backingHeight)

    if (!snap.image) return

    applyCamera(this.ctx, camera, backingWidth, backingHeight)

    const lc: LayerContext = {
      ctx: this.ctx,
      camera,
      image: snap.image,
      grid: snap.grid ?? {
        rowCount: 1,
        colCount: 1,
        insetLeft: 0,
        insetTop: 0,
        insetRight: 0,
        insetBottom: 0,
        cellWidth: snap.image.width,
        cellHeight: snap.image.height,
        originX: 0,
        originY: 0,
        gridWidth: snap.image.width,
        gridHeight: snap.image.height,
      },
      visible: visibleWorldRect(camera),
      showGrid: snap.showGrid && Boolean(snap.grid),
      focus: snap.focus,
      completed: snap.completed,
    }

    this.imageLayer.draw(lc)
    this.gridLayer.draw(lc)
    this.completedLayer.draw(lc)
    if (snap.showFocus) {
      this.highlightLayer.drawFill(lc)
      this.highlightLayer.drawStroke(lc)
    }
    this.countLayer.draw(lc, snap.countStart, snap.countEnd)

    if (snap.showFocus && snap.focus && snap.grid) {
      resetCamera(this.ctx)
      this.highlightLayer.drawLabels(this.ctx, camera, snap.grid, snap.focus, backingWidth, backingHeight)
    }
    if (snap.countStart && snap.grid) {
      resetCamera(this.ctx)
      this.countLayer.drawLabels(
        this.ctx,
        camera,
        snap.grid,
        snap.countStart,
        snap.countEnd,
        snap.countTotal,
        backingWidth,
        backingHeight,
      )
    }
  }
}
