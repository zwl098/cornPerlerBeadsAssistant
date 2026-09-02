import { defineStore } from 'pinia'
import { countCells, type CountResult } from '@/engine/count'
import type { GridCell } from '@/models/types'

export type ToolMode = 'select' | 'count' | 'complete'

type InteractionState = {
  mode: ToolMode
  focus: GridCell | null
  countStart: GridCell | null
  countEnd: GridCell | null
}

function cell(value: GridCell): GridCell {
  return { row: value.row, col: value.col }
}

function outOfRange(value: GridCell, rowCount: number, colCount: number): boolean {
  return value.row > rowCount || value.col > colCount
}

export const useInteractionStore = defineStore('interaction', {
  state: (): InteractionState => ({
    mode: 'select',
    focus: null,
    countStart: null,
    countEnd: null,
  }),
  getters: {
    countResult(state): CountResult | null {
      if (!state.countStart || !state.countEnd) return null
      return countCells(state.countStart, state.countEnd)
    },
    label(state): string {
      if (state.mode === 'count') {
        if (state.countStart && state.countEnd) {
          const result = countCells(state.countStart, state.countEnd)
          return `第 ${result.start.row} 行 × 第 ${result.start.col} 列 → 第 ${result.end.row} 行 × 第 ${result.end.col} 列`
        }
        if (state.countStart) {
          return `起点 第 ${state.countStart.row} 行 × 第 ${state.countStart.col} 列 · 再点终点`
        }
        return '先点起点，再点终点'
      }
      if (state.mode === 'complete') {
        if (!state.focus) return '点一个格子，标记完成'
        return `第 ${state.focus.row} 行 × 第 ${state.focus.col} 列`
      }
      if (!state.focus) return '点一个格子，看看你在哪'
      return `第 ${state.focus.row} 行 × 第 ${state.focus.col} 列`
    },
  },
  actions: {
    setMode(mode: ToolMode) {
      this.mode = mode
    },
    setFocus(next: GridCell) {
      this.focus = cell(next)
    },
    tapCell(next: GridCell) {
      this.focus = cell(next)
      if (this.mode !== 'count') return
      if (!this.countStart || this.countEnd) {
        this.countStart = cell(next)
        this.countEnd = null
        return
      }
      this.countEnd = cell(next)
    },
    clearFocus() {
      this.focus = null
    },
    clearCount() {
      this.countStart = null
      this.countEnd = null
    },
    clampToGrid(rowCount: number, colCount: number) {
      if (this.focus && outOfRange(this.focus, rowCount, colCount)) this.focus = null
      if (this.countStart && outOfRange(this.countStart, rowCount, colCount)) {
        this.countStart = null
        this.countEnd = null
      }
      if (this.countEnd && outOfRange(this.countEnd, rowCount, colCount)) this.countEnd = null
    },
  },
})
