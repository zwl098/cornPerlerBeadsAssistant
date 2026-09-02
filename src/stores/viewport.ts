import { defineStore } from 'pinia'
import {
  capDpr,
  centerOffsets,
  centeredFit,
  clampPan,
  computeScaleLimits,
  panBy as panCamera,
  panWorldOffsets,
  zoomAt as zoomCamera,
} from '@/engine/camera'
import { canvasToWorld } from '@/engine/coord'
import type { CameraState, CanvasPt, ViewportState, WorldPt } from '@/models/types'
import type { SavedView } from '@/persist/types'
import { offsetsFromView } from '@/persist/view'
import { clamp } from '@/utils/math'

type WorldSize = {
  width: number
  height: number
  cellSize: number
}

const emptyCamera: ViewportState = {
  scale: 1,
  minScale: 0.1,
  maxScale: 8,
  offsetX: 0,
  offsetY: 0,
  cssWidth: 0,
  cssHeight: 0,
  dpr: 1,
}

export const useViewportStore = defineStore('viewport', {
  state: (): ViewportState & { fitted: boolean; pendingView: SavedView | null } => ({
    ...emptyCamera,
    fitted: false,
    pendingView: null,
  }),
  getters: {
    camera(state): ViewportState {
      return {
        scale: state.scale,
        minScale: state.minScale,
        maxScale: state.maxScale,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        cssWidth: state.cssWidth,
        cssHeight: state.cssHeight,
        dpr: state.dpr,
      }
    },
    scalePercent(): number {
      return Math.round(this.scale * 100)
    },
  },
  actions: {
    resize(cssWidth: number, cssHeight: number, dpr: number, world: WorldSize | null) {
      const prev = { ...this.camera }
      this.cssWidth = cssWidth
      this.cssHeight = cssHeight
      this.dpr = capDpr(dpr)

      if (!world || cssWidth <= 0 || cssHeight <= 0) return

      const limits = computeScaleLimits(cssWidth, cssHeight, world.width, world.height, world.cellSize)
      this.minScale = limits.minScale
      this.maxScale = limits.maxScale

      if (this.pendingView) {
        const view = this.pendingView
        this.pendingView = null
        this.scale = clamp(view.scale, this.minScale, this.maxScale)
        const offset = offsetsFromView({ ...view, scale: this.scale }, cssWidth, cssHeight)
        this.offsetX = offset.offsetX
        this.offsetY = offset.offsetY
        this.applyClamp(world)
        this.fitted = true
        return
      }

      if (!this.fitted || prev.cssWidth <= 0) {
        this.fit(world)
        return
      }

      const worldAtCenter = canvasToWorld(
        { canvasX: prev.cssWidth / 2, canvasY: prev.cssHeight / 2 },
        prev,
      )
      this.scale = Math.min(Math.max(this.scale, this.minScale), this.maxScale)
      this.offsetX = cssWidth / 2 - worldAtCenter.worldX * this.scale
      this.offsetY = cssHeight / 2 - worldAtCenter.worldY * this.scale
      this.applyClamp(world)
    },
    fit(world: WorldSize) {
      if (this.cssWidth <= 0 || this.cssHeight <= 0) return
      const limits = computeScaleLimits(
        this.cssWidth,
        this.cssHeight,
        world.width,
        world.height,
        world.cellSize,
      )
      const fitted = centeredFit(this.cssWidth, this.cssHeight, world.width, world.height, limits)
      this.assignCamera(fitted)
      this.fitted = true
    },
    zoomAt(anchor: CanvasPt, factor: number, world: WorldSize) {
      this.assignCamera(zoomCamera(this.camera, anchor, factor))
      this.applyClamp(world)
    },
    zoomPinch(anchor: CanvasPt, factor: number, followDx: number, followDy: number, world: WorldSize) {
      this.assignCamera(panCamera(zoomCamera(this.camera, anchor, factor), followDx, followDy))
      this.applyClamp(world)
    },
    panBy(dx: number, dy: number, world: WorldSize) {
      this.assignCamera(panCamera(this.camera, dx, dy))
      this.applyClamp(world)
    },
    panWorld(dwx: number, dwy: number, world: WorldSize) {
      const next = panWorldOffsets(this.camera, dwx, dwy)
      this.offsetX = next.offsetX
      this.offsetY = next.offsetY
      this.applyClamp(world)
    },
    centerOnWorld(point: WorldPt, world: WorldSize) {
      const next = centerOffsets(this.camera, point)
      this.offsetX = next.offsetX
      this.offsetY = next.offsetY
      this.applyClamp(world)
    },
    reset() {
      Object.assign(this, { ...emptyCamera, fitted: false, pendingView: null })
    },
    restoreView(view: SavedView | null) {
      this.pendingView = view
      this.fitted = Boolean(view)
    },
    assignCamera(next: CameraState) {
      this.scale = next.scale
      this.minScale = next.minScale
      this.maxScale = next.maxScale
      this.offsetX = next.offsetX
      this.offsetY = next.offsetY
    },
    applyClamp(world: WorldSize) {
      const clamped = clampPan(this.camera, world.width, world.height)
      this.offsetX = clamped.offsetX
      this.offsetY = clamped.offsetY
    },
  },
})
