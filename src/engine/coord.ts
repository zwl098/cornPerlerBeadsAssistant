import type {
  CameraState,
  CanvasPt,
  GridCell,
  GridMetrics,
  ScreenPt,
  ViewportState,
  WorldPt,
  WorldRect,
} from '../models/types'

export type CanvasRect = { left: number; top: number }

export function screenToCanvas(screen: ScreenPt, rect: CanvasRect): CanvasPt {
  return {
    canvasX: screen.screenX - rect.left,
    canvasY: screen.screenY - rect.top,
  }
}

export function canvasToScreen(canvas: CanvasPt, rect: CanvasRect): ScreenPt {
  return {
    screenX: canvas.canvasX + rect.left,
    screenY: canvas.canvasY + rect.top,
  }
}

export function canvasToWorld(canvas: CanvasPt, cam: CameraState): WorldPt {
  return {
    worldX: (canvas.canvasX - cam.offsetX) / cam.scale,
    worldY: (canvas.canvasY - cam.offsetY) / cam.scale,
  }
}

export function worldToCanvas(world: WorldPt, cam: CameraState): CanvasPt {
  return {
    canvasX: world.worldX * cam.scale + cam.offsetX,
    canvasY: world.worldY * cam.scale + cam.offsetY,
  }
}

export function worldToGrid(world: WorldPt, grid: GridMetrics): GridCell | null {
  const localX = world.worldX - grid.originX
  const localY = world.worldY - grid.originY
  if (localX < 0 || localY < 0 || localX >= grid.gridWidth || localY >= grid.gridHeight) {
    return null
  }
  const col = Math.min(grid.colCount, Math.floor(localX / grid.cellWidth) + 1)
  const row = Math.min(grid.rowCount, Math.floor(localY / grid.cellHeight) + 1)
  return { row, col }
}

export function gridToWorldRect(cell: GridCell, grid: GridMetrics): WorldRect {
  return {
    x: grid.originX + (cell.col - 1) * grid.cellWidth,
    y: grid.originY + (cell.row - 1) * grid.cellHeight,
    w: grid.cellWidth,
    h: grid.cellHeight,
  }
}

export function gridToWorldCenter(cell: GridCell, grid: GridMetrics): WorldPt {
  const rect = gridToWorldRect(cell, grid)
  return {
    worldX: rect.x + rect.w / 2,
    worldY: rect.y + rect.h / 2,
  }
}

export function canvasToGrid(canvas: CanvasPt, cam: CameraState, grid: GridMetrics): GridCell | null {
  return worldToGrid(canvasToWorld(canvas, cam), grid)
}

export function screenToWorld(screen: ScreenPt, cam: CameraState, rect: CanvasRect): WorldPt {
  return canvasToWorld(screenToCanvas(screen, rect), cam)
}

export function screenToGrid(
  screen: ScreenPt,
  cam: CameraState,
  rect: CanvasRect,
  grid: GridMetrics,
): GridCell | null {
  return worldToGrid(screenToWorld(screen, cam, rect), grid)
}

export function visibleWorldRect(cam: ViewportState): WorldRect {
  return {
    x: (0 - cam.offsetX) / cam.scale,
    y: (0 - cam.offsetY) / cam.scale,
    w: cam.cssWidth / cam.scale,
    h: cam.cssHeight / cam.scale,
  }
}

export function worldRectToCanvas(rect: WorldRect, cam: CameraState): WorldRect {
  const a = worldToCanvas({ worldX: rect.x, worldY: rect.y }, cam)
  const b = worldToCanvas({ worldX: rect.x + rect.w, worldY: rect.y + rect.h }, cam)
  return {
    x: a.canvasX,
    y: a.canvasY,
    w: b.canvasX - a.canvasX,
    h: b.canvasY - a.canvasY,
  }
}
