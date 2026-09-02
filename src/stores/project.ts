import { defineStore } from 'pinia'
import { DEFAULT_GRID, MAX_GRID_COUNT, MIN_GRID_COUNT, type GridSpec, type ImageAsset } from '@/models/types'
import { buildGridMetrics, gridStillFits, hasGridSize, isGridCalibrated, scaleGrid, shiftGrid, suggestPixelGrid } from '@/models/grid'
import { newProjectId } from '@/utils/id'
import { clamp } from '@/utils/math'

type ProjectState = {
  projectId: string
  name: string
  createdAt: number
  image: ImageAsset | null
  grid: GridSpec
}

function revoke(image: ImageAsset | null) {
  if (!image) return
  if (image.objectUrl) URL.revokeObjectURL(image.objectUrl)
  image.bitmap?.close()
}

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_GRID_COUNT
  return clamp(Math.round(value), MIN_GRID_COUNT, MAX_GRID_COUNT)
}

function gridForImage(image: ImageAsset): GridSpec {
  const hint = suggestPixelGrid(image.width, image.height)
  if (!hint) return { ...DEFAULT_GRID }
  return {
    rowCount: hint.rowCount,
    colCount: hint.colCount,
    insetLeft: 0,
    insetTop: 0,
    insetRight: 0,
    insetBottom: 0,
    calibrated: true,
  }
}

function normalizeRestoredGrid(grid: GridSpec): GridSpec {
  const rowCount = Number.isFinite(grid.rowCount) ? Math.round(grid.rowCount) : 0
  const colCount = Number.isFinite(grid.colCount) ? Math.round(grid.colCount) : 0
  const sized = hasGridSize({ rowCount, colCount })
  return {
    rowCount: sized ? sanitizeCount(rowCount) : 0,
    colCount: sized ? sanitizeCount(colCount) : 0,
    insetLeft: grid.insetLeft,
    insetTop: grid.insetTop,
    insetRight: grid.insetRight,
    insetBottom: grid.insetBottom,
    calibrated: grid.calibrated !== false && sized,
  }
}

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    projectId: 'draft',
    name: '',
    createdAt: 0,
    image: null,
    grid: { ...DEFAULT_GRID },
  }),
  getters: {
    hasImage: (state) => Boolean(state.image?.objectUrl),
    hasGridSize: (state) => hasGridSize(state.grid),
    gridCalibrated: (state) => isGridCalibrated(state.grid),
    gridMetrics: (state) => {
      if (!state.image || !hasGridSize(state.grid)) return null
      return buildGridMetrics(state.grid, state.image.width, state.image.height)
    },
    totalCells: (state) => (hasGridSize(state.grid) ? state.grid.rowCount * state.grid.colCount : 0),
    worldSize: (state) => {
      if (!state.image) return null
      const metrics = hasGridSize(state.grid)
        ? buildGridMetrics(state.grid, state.image.width, state.image.height)
        : null
      return {
        width: state.image.width,
        height: state.image.height,
        cellSize: metrics ? Math.min(metrics.cellWidth, metrics.cellHeight) : 1,
      }
    },
  },
  actions: {
    setImage(name: string, image: ImageAsset) {
      revoke(this.image)
      this.projectId = newProjectId()
      this.createdAt = Date.now()
      this.name = name
      this.image = { ...image, bitmap: image.bitmap ?? null }
      this.grid = gridForImage(image)
    },
    restore(payload: {
      id: string
      name: string
      createdAt: number
      image: ImageAsset
      grid: GridSpec
    }) {
      revoke(this.image)
      this.projectId = payload.id
      this.createdAt = payload.createdAt
      this.name = payload.name
      this.image = { ...payload.image, bitmap: payload.image.bitmap ?? null }
      this.grid = normalizeRestoredGrid(payload.grid)
    },
    setBitmap(bitmap: ImageBitmap | null) {
      if (!this.image) return
      this.image.bitmap?.close()
      this.image.bitmap = bitmap
    },
    applyGrid(spec: GridSpec) {
      this.grid = {
        rowCount: sanitizeCount(spec.rowCount),
        colCount: sanitizeCount(spec.colCount),
        insetLeft: spec.insetLeft,
        insetTop: spec.insetTop,
        insetRight: spec.insetRight,
        insetBottom: spec.insetBottom,
        calibrated: true,
      }
    },
    nudge(dx: number, dy: number) {
      if (!this.image || !isGridCalibrated(this.grid)) return
      const next = shiftGrid(this.grid, dx, dy)
      if (!gridStillFits(next, this.image.width, this.image.height)) return
      this.grid.insetLeft = next.insetLeft
      this.grid.insetTop = next.insetTop
      this.grid.insetRight = next.insetRight
      this.grid.insetBottom = next.insetBottom
    },
    growCells(grow: number) {
      if (!this.image || !isGridCalibrated(this.grid)) return
      const next = scaleGrid(this.grid, grow)
      if (!gridStillFits(next, this.image.width, this.image.height)) return
      this.grid.insetLeft = next.insetLeft
      this.grid.insetTop = next.insetTop
      this.grid.insetRight = next.insetRight
      this.grid.insetBottom = next.insetBottom
    },
    setGridSize(rowCount: number, colCount: number) {
      this.grid.rowCount = sanitizeCount(rowCount)
      this.grid.colCount = sanitizeCount(colCount)
    },
    rename(name: string) {
      const next = name.trim().slice(0, 40)
      if (next) this.name = next
    },
    clear() {
      revoke(this.image)
      this.projectId = 'draft'
      this.name = ''
      this.createdAt = 0
      this.image = null
      this.grid = { ...DEFAULT_GRID }
    },
  },
})
