import { defineStore } from 'pinia'

export type ToastTone = 'info' | 'ok' | 'warn' | 'danger'

export type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ModalKind = 'oversize'

type UiState = {
  toasts: ToastItem[]
  reselectToken: number
  modal: {
    open: boolean
    kind: ModalKind
    title: string
    body: string
  }
}

let toastSeq = 1
const TOAST_MS = 3200

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    toasts: [],
    reselectToken: 0,
    modal: {
      open: false,
      kind: 'oversize',
      title: '',
      body: '',
    },
  }),
  actions: {
    toast(message: string, tone: ToastTone = 'info') {
      const id = toastSeq++
      this.toasts = [{ id, message, tone }]
      window.setTimeout(() => {
        this.toasts = this.toasts.filter((item) => item.id !== id)
      }, TOAST_MS)
    },
    dismissToast() {
      this.toasts = []
    },
    openOversizeModal(body: string) {
      this.modal = {
        open: true,
        kind: 'oversize',
        title: '图片太大了',
        body,
      }
    },
    closeModal() {
      this.modal.open = false
    },
    requestReselect() {
      this.modal.open = false
      this.reselectToken += 1
    },
  },
})
