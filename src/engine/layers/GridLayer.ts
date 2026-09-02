import type { Layer, LayerContext } from '@/engine/layers/types'

const GRID_COLOR = 'rgba(26, 26, 26, 0.22)'

function lineStep(screenCell: number): number {
  if (screenCell < 3) return 10
  if (screenCell < 6) return 4
  if (screenCell < 10) return 2
  return 1
}

export class GridLayer implements Layer {
  readonly name = 'grid'

  draw(lc: LayerContext): void {
    if (!lc.showGrid) return

    const { ctx, camera, grid, visible } = lc
    if (grid.cellWidth <= 0 || grid.cellHeight <= 0) return

    const screenCell = Math.min(grid.cellWidth, grid.cellHeight) * camera.scale
    const stepX = lineStep(grid.cellWidth * camera.scale)
    const stepY = lineStep(grid.cellHeight * camera.scale)

    const pad = Math.max(grid.cellWidth, grid.cellHeight)
    const left = visible.x - pad
    const right = visible.x + visible.w + pad
    const top = visible.y - pad
    const bottom = visible.y + visible.h + pad

    const y0 = grid.originY
    const y1 = grid.originY + grid.gridHeight
    const x0 = grid.originX
    const x1 = grid.originX + grid.gridWidth

    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 1 / camera.scale
    ctx.beginPath()

    for (let c = 0; c <= grid.colCount; c += 1) {
      if (c !== 0 && c !== grid.colCount && c % stepX !== 0) continue
      const x = x0 + c * grid.cellWidth
      if (x < left || x > right) continue
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y1)
    }

    for (let r = 0; r <= grid.rowCount; r += 1) {
      if (r !== 0 && r !== grid.rowCount && r % stepY !== 0) continue
      const y = y0 + r * grid.cellHeight
      if (y < top || y > bottom) continue
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
    }

    ctx.stroke()

    if (screenCell < 3) {
      ctx.strokeStyle = 'rgba(26, 26, 26, 0.38)'
      ctx.strokeRect(x0, y0, grid.gridWidth, grid.gridHeight)
    }
  }
}
