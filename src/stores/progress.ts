import { defineStore } from 'pinia'
import type { CellId } from '@/models/cellId'
import {
  applyComplete,
  HISTORY_LIMIT,
  pushLimited,
  type CompleteCommand,
} from '@/engine/completeHistory'

type ProgressState = {
  completed: Set<CellId>
  undoStack: CompleteCommand[]
  redoStack: CompleteCommand[]
}

export const useProgressStore = defineStore('progress', {
  state: (): ProgressState => ({
    completed: new Set<CellId>(),
    undoStack: [],
    redoStack: [],
  }),
  getters: {
    doneCount: (state) => state.completed.size,
    canUndo: (state) => state.undoStack.length > 0,
    canRedo: (state) => state.redoStack.length > 0,
  },
  actions: {
    isCompleted(id: CellId): boolean {
      return this.completed.has(id)
    },
    toggle(id: CellId) {
      const value = !this.completed.has(id)
      this.completed = applyComplete(this.completed, [id], value)
      this.undoStack = pushLimited(this.undoStack, { ids: [id], value }, HISTORY_LIMIT)
      this.redoStack = []
    },
    undo() {
      const command = this.undoStack[this.undoStack.length - 1]
      if (!command) return
      this.undoStack = this.undoStack.slice(0, -1)
      this.completed = applyComplete(this.completed, command.ids, !command.value)
      this.redoStack = [...this.redoStack, command]
    },
    redo() {
      const command = this.redoStack[this.redoStack.length - 1]
      if (!command) return
      this.redoStack = this.redoStack.slice(0, -1)
      this.completed = applyComplete(this.completed, command.ids, command.value)
      this.undoStack = pushLimited(this.undoStack, command, HISTORY_LIMIT)
    },
    reset() {
      this.completed = new Set()
      this.undoStack = []
      this.redoStack = []
    },
    replaceAll(ids: Iterable<number>) {
      this.completed = new Set(ids)
      this.undoStack = []
      this.redoStack = []
    },
  },
})
