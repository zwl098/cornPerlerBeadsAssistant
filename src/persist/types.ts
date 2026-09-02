import type { GridCell, GridSpec } from '@/models/types'

export type SavedView = {
  scale: number
  centerX: number
  centerY: number
}

export type ProjectRecord = {
  id: string
  name: string
  width: number
  height: number
  mime: string
  originalName: string
  fileSize: number
  grid: GridSpec
  view: SavedView | null
  focus: GridCell | null
  showGrid: boolean
  createdAt: number
  lastUsedAt: number
}

export type ImageRecord = {
  id: string
  blob: Blob
  mime: string
  width: number
  height: number
  originalName: string
  fileSize: number
}

export type CellsRecord = {
  id: string
  completed: Int32Array
}

export type AppSettingsRecord = {
  showGrid: boolean
}
