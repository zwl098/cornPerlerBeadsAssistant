import type { GridCell } from './types'

export type CellId = number

export function packCell(row: number, col: number, colCount: number): CellId {
  return (row - 1) * colCount + (col - 1)
}

export function unpackCell(id: CellId, colCount: number): GridCell {
  return {
    row: Math.floor(id / colCount) + 1,
    col: (id % colCount) + 1,
  }
}
