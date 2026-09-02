import type { CellId } from '@/models/cellId'
import type { GridCell, GridMetrics, ViewportState, WorldRect } from '@/models/types'

export type EngineImage = {
  width: number
  height: number
  bitmap: CanvasImageSource
}

export type LayerContext = {
  ctx: CanvasRenderingContext2D
  camera: ViewportState
  image: EngineImage
  grid: GridMetrics
  visible: WorldRect
  showGrid: boolean
  focus: GridCell | null
  completed: ReadonlySet<CellId>
}

export interface Layer {
  readonly name: string
  draw(lc: LayerContext): void
}
