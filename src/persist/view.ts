import type { ViewportState } from '../models/types'
import type { SavedView } from './types'

export function cameraToView(cam: ViewportState): SavedView | null {
  if (cam.cssWidth <= 0 || cam.cssHeight <= 0 || !(cam.scale > 0)) return null
  return {
    scale: cam.scale,
    centerX: (cam.cssWidth / 2 - cam.offsetX) / cam.scale,
    centerY: (cam.cssHeight / 2 - cam.offsetY) / cam.scale,
  }
}

export function offsetsFromView(view: SavedView, cssWidth: number, cssHeight: number) {
  return {
    offsetX: cssWidth / 2 - view.centerX * view.scale,
    offsetY: cssHeight / 2 - view.centerY * view.scale,
  }
}

export function encodeCompleted(ids: Iterable<number>): Int32Array {
  return Int32Array.from(ids)
}

export function decodeCompleted(value: Int32Array | number[] | null | undefined): number[] {
  if (!value) return []
  return Array.from(value)
}
