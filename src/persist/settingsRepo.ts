import { LAST_PROJECT_KEY, SETTINGS_KEY } from './constants'
import type { AppSettingsRecord } from './types'

const DEFAULT_SETTINGS: AppSettingsRecord = {
  showGrid: true,
}

export function loadSettings(): AppSettingsRecord {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettingsRecord>
    return {
      showGrid: parsed.showGrid !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettingsRecord): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // quota / private mode
  }
}

export function loadLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY)
  } catch {
    return null
  }
}

export function saveLastProjectId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_PROJECT_KEY, id)
    else localStorage.removeItem(LAST_PROJECT_KEY)
  } catch {
    // ignore
  }
}
