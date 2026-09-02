import type { CameraState, CanvasPt, ViewportState } from '../models/types'
import { canvasToWorld } from './coord'
import { clamp } from '../utils/math'

export const FIT_PADDING = 16
export const MAX_CELL_CSS = 120
export const DPR_CAP = 3

export function capDpr(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1
  return Math.min(raw, DPR_CAP)
}

export function fitScale(cssWidth: number, cssHeight: number, worldW: number, worldH: number): number {
  if (worldW <= 0 || worldH <= 0 || cssWidth <= 0 || cssHeight <= 0) return 1
  const availW = Math.max(1, cssWidth - FIT_PADDING * 2)
  const availH = Math.max(1, cssHeight - FIT_PADDING * 2)
  return Math.min(availW / worldW, availH / worldH)
}

export function computeScaleLimits(
  cssWidth: number,
  cssHeight: number,
  worldW: number,
  worldH: number,
  cellSize: number,
): { minScale: number; maxScale: number } {
  const minScale = fitScale(cssWidth, cssHeight, worldW, worldH)
  const maxFromCell = cellSize > 0 ? MAX_CELL_CSS / cellSize : minScale * 8
  return {
    minScale,
    maxScale: Math.max(minScale, maxFromCell),
  }
}

export function centeredFit(
  cssWidth: number,
  cssHeight: number,
  worldW: number,
  worldH: number,
  limits: { minScale: number; maxScale: number },
): CameraState {
  const scale = clamp(fitScale(cssWidth, cssHeight, worldW, worldH), limits.minScale, limits.maxScale)
  return {
    scale,
    minScale: limits.minScale,
    maxScale: limits.maxScale,
    offsetX: (cssWidth - worldW * scale) / 2,
    offsetY: (cssHeight - worldH * scale) / 2,
  }
}

export function zoomAt(cam: CameraState, anchor: CanvasPt, factor: number): CameraState {
  const world = canvasToWorld(anchor, cam)
  const scale = clamp(cam.scale * factor, cam.minScale, cam.maxScale)
  return {
    ...cam,
    scale,
    offsetX: anchor.canvasX - world.worldX * scale,
    offsetY: anchor.canvasY - world.worldY * scale,
  }
}

export function panBy(cam: CameraState, dx: number, dy: number): CameraState {
  return {
    ...cam,
    offsetX: cam.offsetX + dx,
    offsetY: cam.offsetY + dy,
  }
}

export function clampPan(cam: ViewportState, worldW: number, worldH: number): ViewportState {
  const overlapX = Math.min(cam.cssWidth * 0.24, worldW * cam.scale)
  const overlapY = Math.min(cam.cssHeight * 0.24, worldH * cam.scale)
  const minX = overlapX - worldW * cam.scale
  const maxX = cam.cssWidth - overlapX
  const minY = overlapY - worldH * cam.scale
  const maxY = cam.cssHeight - overlapY

  return {
    ...cam,
    offsetX: minX > maxX ? (cam.cssWidth - worldW * cam.scale) / 2 : clamp(cam.offsetX, minX, maxX),
    offsetY: minY > maxY ? (cam.cssHeight - worldH * cam.scale) / 2 : clamp(cam.offsetY, minY, maxY),
  }
}

export function fitWorldCamera(
  cssWidth: number,
  cssHeight: number,
  worldW: number,
  worldH: number,
  dpr: number,
  padding = 6,
): ViewportState {
  const availW = Math.max(1, cssWidth - padding * 2)
  const availH = Math.max(1, cssHeight - padding * 2)
  const scale = worldW > 0 && worldH > 0 ? Math.min(availW / worldW, availH / worldH) : 1
  return {
    scale,
    minScale: scale,
    maxScale: scale,
    offsetX: (cssWidth - worldW * scale) / 2,
    offsetY: (cssHeight - worldH * scale) / 2,
    cssWidth,
    cssHeight,
    dpr: capDpr(dpr),
  }
}

export function centerOffsets(cam: Pick<ViewportState, 'cssWidth' | 'cssHeight' | 'scale'>, world: { worldX: number; worldY: number }) {
  return {
    offsetX: cam.cssWidth / 2 - world.worldX * cam.scale,
    offsetY: cam.cssHeight / 2 - world.worldY * cam.scale,
  }
}

export function panWorldOffsets(cam: CameraState, dwx: number, dwy: number) {
  return {
    offsetX: cam.offsetX - dwx * cam.scale,
    offsetY: cam.offsetY - dwy * cam.scale,
  }
}

export function applyCamera(
  ctx: CanvasRenderingContext2D,
  cam: ViewportState,
  backingWidth: number,
  backingHeight: number,
): void {
  const sx = backingWidth / cam.cssWidth
  const sy = backingHeight / cam.cssHeight
  ctx.setTransform(
    sx * cam.scale,
    0,
    0,
    sy * cam.scale,
    sx * cam.offsetX,
    sy * cam.offsetY,
  )
}

export function resetCamera(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export function wheelFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.0016)
}
