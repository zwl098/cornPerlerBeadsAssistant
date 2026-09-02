import { countBounds } from '../count'
import { gridToWorldCenter, gridToWorldRect, worldToCanvas } from '../coord'
import type { LayerContext } from './types'
import type { GridCell, GridMetrics, ViewportState } from '../../models/types'

const REGION_FILL = 'rgba(46, 139, 87, 0.16)'
const REGION_STROKE = '#1F7A4D'
const START_FILL = 'rgba(46, 139, 87, 0.28)'
const END_FILL = 'rgba(31, 122, 77, 0.22)'
const LABEL_BG = 'rgba(255, 253, 251, 0.94)'
const LABEL_INK = '#1F7A4D'

export class CountLayer {
  readonly name = 'count'

  draw(
    lc: LayerContext,
    start: GridCell | null,
    end: GridCell | null,
  ): void {
    if (!start) return
    const { ctx, camera, grid } = lc
    const unit = 1 / camera.scale

    if (end) {
      const bounds = countBounds(start, end)
      const region = unionRect(grid, bounds)
      ctx.fillStyle = REGION_FILL
      ctx.fillRect(region.x, region.y, region.w, region.h)
      ctx.strokeStyle = REGION_STROKE
      ctx.lineWidth = 1.5 * unit
      ctx.strokeRect(region.x, region.y, region.w, region.h)
    }

    paintCell(ctx, grid, start, START_FILL, unit)
    if (end && (end.row !== start.row || end.col !== start.col)) {
      paintCell(ctx, grid, end, END_FILL, unit)
    }
  }

  drawLabels(
    ctx: CanvasRenderingContext2D,
    camera: ViewportState,
    grid: GridMetrics,
    start: GridCell,
    end: GridCell | null,
    total: number | null,
    backingWidth: number,
    backingHeight: number,
  ): void {
    const sx = backingWidth / camera.cssWidth
    const sy = backingHeight / camera.cssHeight
    ctx.setTransform(sx, 0, 0, sy, 0, 0)

    const startPt = worldToCanvas(gridToWorldCenter(start, grid), camera)
    drawTag(ctx, startPt.canvasX, startPt.canvasY, end ? '起' : '起点')

    if (end) {
      if (end.row !== start.row || end.col !== start.col) {
        const endPt = worldToCanvas(gridToWorldCenter(end, grid), camera)
        drawTag(ctx, endPt.canvasX, endPt.canvasY, '终')
      }
      if (total !== null) {
        const region = unionRect(grid, countBounds(start, end))
        const midPt = worldToCanvas(
          { worldX: region.x + region.w / 2, worldY: region.y + region.h / 2 },
          camera,
        )
        const offset = end.row === start.row && end.col === start.col ? 18 : 0
        drawTag(ctx, midPt.canvasX, midPt.canvasY + offset, `共 ${total}`)
      }
    }
  }
}

function unionRect(
  grid: GridMetrics,
  bounds: { rowMin: number; rowMax: number; colMin: number; colMax: number },
) {
  const a = gridToWorldRect({ row: bounds.rowMin, col: bounds.colMin }, grid)
  const b = gridToWorldRect({ row: bounds.rowMax, col: bounds.colMax }, grid)
  return {
    x: a.x,
    y: a.y,
    w: b.x + b.w - a.x,
    h: b.y + b.h - a.y,
  }
}

function paintCell(
  ctx: CanvasRenderingContext2D,
  grid: GridMetrics,
  cell: GridCell,
  fill: string,
  unit: number,
) {
  const rect = gridToWorldRect(cell, grid)
  ctx.fillStyle = fill
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.strokeStyle = REGION_STROKE
  ctx.lineWidth = 2 * unit
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
}

function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.save()
  ctx.font = '600 12px "JetBrains Mono", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const width = Math.max(24, ctx.measureText(text).width + 12)
  const height = 20
  const left = x - width / 2
  const top = y - height / 2
  const r = 4
  ctx.beginPath()
  ctx.moveTo(left + r, top)
  ctx.arcTo(left + width, top, left + width, top + height, r)
  ctx.arcTo(left + width, top + height, left, top + height, r)
  ctx.arcTo(left, top + height, left, top, r)
  ctx.arcTo(left, top, left + width, top, r)
  ctx.closePath()
  ctx.fillStyle = LABEL_BG
  ctx.fill()
  ctx.strokeStyle = REGION_STROKE
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = LABEL_INK
  ctx.fillText(text, x, y)
  ctx.restore()
}
