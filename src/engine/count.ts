import type { GridCell } from '../models/types'

export type CountResult = {
  start: GridCell
  end: GridCell
  colSpan: number
  rowSpan: number
  total: number
}

export type CountBounds = {
  rowMin: number
  rowMax: number
  colMin: number
  colMax: number
}

export function span(a: number, b: number): number {
  return Math.abs(b - a) + 1
}

export function countCells(start: GridCell, end: GridCell): CountResult {
  const colSpan = span(start.col, end.col)
  const rowSpan = span(start.row, end.row)
  return {
    start: { row: start.row, col: start.col },
    end: { row: end.row, col: end.col },
    colSpan,
    rowSpan,
    total: colSpan * rowSpan,
  }
}

export function countBounds(start: GridCell, end: GridCell): CountBounds {
  return {
    rowMin: Math.min(start.row, end.row),
    rowMax: Math.max(start.row, end.row),
    colMin: Math.min(start.col, end.col),
    colMax: Math.max(start.col, end.col),
  }
}
