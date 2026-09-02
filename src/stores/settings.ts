import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    showGrid: true,
  }),
  actions: {
    setShowGrid(show: boolean) {
      this.showGrid = show
    },
    toggleGrid() {
      this.showGrid = !this.showGrid
    },
  },
})
