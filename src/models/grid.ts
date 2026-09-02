import { MAX_GRID_COUNT, MIN_GRID_COUNT, type GridMetrics, type GridSpec, type WorldPt } from './types'

export function hasGridSize(spec: Pick<GridSpec, 'rowCount' | 'colCount'>): boolean {
  return spec.rowCount >= MIN_GRID_COUNT && spec.colCount >= MIN_GRID_COUNT
}

export function isGridCalibrated(spec: GridSpec): boolean {
  return spec.calibrated === true && hasGridSize(spec)
}

/** 仅当图片本身就是「一像素一豆」时给建议；大截图不猜。 */
export function suggestPixelGrid(width: number, height: number): { rowCount: number; colCount: number } | null {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null
  if (width < MIN_GRID_COUNT || height < MIN_GRID_COUNT) return null
  if (width > MAX_GRID_COUNT || height > MAX_GRID_COUNT) return null
  return { rowCount: height, colCount: width }
}

/**
 * 两点按「第一颗 / 最后一颗」的格心解释。
 * 不改 Camera：只算出 GridSpec 的行列和 inset。
 */
export function gridFromCellCenters(
  a: WorldPt,
  b: WorldPt,
  rowCount: number,
  colCount: number,
  imageWidth: number,
  imageHeight: number,
): GridSpec | null {
  const rows = Math.round(rowCount)
  const cols = Math.round(colCount)
  if (rows < 2 || cols < 2 || rows > MAX_GRID_COUNT || cols > MAX_GRID_COUNT) return null
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)) return null
  if (imageWidth < 2 || imageHeight < 2) return null

  const x0 = Math.min(a.worldX, b.worldX)
  const x1 = Math.max(a.worldX, b.worldX)
  const y0 = Math.min(a.worldY, b.worldY)
  const y1 = Math.max(a.worldY, b.worldY)
  const spanX = x1 - x0
  const spanY = y1 - y0
  if (spanX < 2 || spanY < 2) return null

  const cellWidth = spanX / (cols - 1)
  const cellHeight = spanY / (rows - 1)
  if (cellWidth < 1 || cellHeight < 1) return null

  const originX = x0 - cellWidth / 2
  const originY = y0 - cellHeight / 2
  const gridWidth = cellWidth * cols
  const gridHeight = cellHeight * rows
  if (gridWidth < 2 || gridHeight < 2) return null

  const insetLeft = originX
  const insetTop = originY
  const insetRight = imageWidth - originX - gridWidth
  const insetBottom = imageHeight - originY - gridHeight

  if (!Number.isFinite(insetLeft) || !Number.isFinite(insetTop) || !Number.isFinite(insetRight) || !Number.isFinite(insetBottom)) {
    return null
  }

  return {
    rowCount: rows,
    colCount: cols,
    insetLeft,
    insetTop,
    insetRight,
    insetBottom,
    calibrated: true,
  }
}

export function buildGridMetrics(spec: GridSpec, imageWidth: number, imageHeight: number): GridMetrics {
  const colCount = Math.max(1, spec.colCount)
  const rowCount = Math.max(1, spec.rowCount)
  const insetLeft = spec.insetLeft
  const insetTop = spec.insetTop
  const insetRight = spec.insetRight
  const insetBottom = spec.insetBottom
  const gridWidth = Math.max(0, imageWidth - insetLeft - insetRight)
  const gridHeight = Math.max(0, imageHeight - insetTop - insetBottom)

  return {
    rowCount,
    colCount,
    insetLeft,
    insetTop,
    insetRight,
    insetBottom,
    originX: insetLeft,
    originY: insetTop,
    gridWidth,
    gridHeight,
    cellWidth: gridWidth / colCount,
    cellHeight: gridHeight / rowCount,
  }
}
