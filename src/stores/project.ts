import { defineStore } from 'pinia'
import { DEFAULT_GRID, MAX_GRID_COUNT, MIN_GRID_COUNT, type GridSpec, type ImageAsset } from '@/models/types'
import { buildGridMetrics } from '@/models/grid'
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
    gridMetrics: (state) => {
      if (!state.image) return null
      return buildGridMetrics(state.grid, state.image.width, state.image.height)
    },
    totalCells: (state) => state.grid.rowCount * state.grid.colCount,
    worldSize: (state) => {
      if (!state.image) return null
      const metrics = buildGridMetrics(state.grid, state.image.width, state.image.height)
      return {
        width: state.image.width,
        height: state.image.height,
        cellSize: Math.min(metrics.cellWidth, metrics.cellHeight),
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
      this.grid = { ...DEFAULT_GRID }
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
      this.grid = { ...payload.grid }
    },
    setBitmap(bitmap: ImageBitmap | null) {
      if (!this.image) return
      this.image.bitmap?.close()
      this.image.bitmap = bitmap
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
