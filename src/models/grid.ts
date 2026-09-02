import type { GridMetrics, GridSpec } from './types'

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
