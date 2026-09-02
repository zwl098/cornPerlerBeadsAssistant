export type ScreenPt = { screenX: number; screenY: number }
export type CanvasPt = { canvasX: number; canvasY: number }
export type WorldPt = { worldX: number; worldY: number }
export type GridCell = { row: number; col: number }

export type WorldRect = {
  x: number
  y: number
  w: number
  h: number
}

export type CameraState = {
  scale: number
  minScale: number
  maxScale: number
  offsetX: number
  offsetY: number
}

export type ViewportState = CameraState & {
  cssWidth: number
  cssHeight: number
  dpr: number
}

export type GridSpec = {
  rowCount: number
  colCount: number
  insetLeft: number
  insetTop: number
  insetRight: number
  insetBottom: number
  calibrated?: boolean
}

export type GridMetrics = GridSpec & {
  cellWidth: number
  cellHeight: number
  originX: number
  originY: number
  gridWidth: number
  gridHeight: number
}

export type ImageAsset = {
  mime: string
  width: number
  height: number
  objectUrl: string
  fileSize: number
  originalName: string
  bitmap: ImageBitmap | null
}

export const DEFAULT_GRID: GridSpec = {
  rowCount: 0,
  colCount: 0,
  insetLeft: 0,
  insetTop: 0,
  insetRight: 0,
  insetBottom: 0,
  calibrated: false,
}

export const PIN_PRESETS = [
  { label: '29×29', rowCount: 29, colCount: 29 },
  { label: '32×32', hint: '四宫格', rowCount: 32, colCount: 32 },
  { label: '50×50', rowCount: 50, colCount: 50 },
] as const

export const GRID_PRESETS = [
  { label: '29×29', rowCount: 29, colCount: 29 },
  { label: '32×32', rowCount: 32, colCount: 32 },
  { label: '50×50', rowCount: 50, colCount: 50 },
  { label: '100×100', rowCount: 100, colCount: 100 },
  { label: '200×200', rowCount: 200, colCount: 200 },
  { label: '500×500', rowCount: 500, colCount: 500 },
] as const

export const MAX_GRID_COUNT = 500
export const MIN_GRID_COUNT = 1
