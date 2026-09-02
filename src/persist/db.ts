import { DB_NAME, DB_VERSION } from './constants'

const PROJECTS = 'projects'
const IMAGES = 'images'
const CELLS = 'cells'

let dbPromise: Promise<IDBDatabase> | null = null

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb()
  return dbPromise
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(PROJECTS)) {
        const projects = db.createObjectStore(PROJECTS, { keyPath: 'id' })
        projects.createIndex('lastUsedAt', 'lastUsedAt')
      }
      if (!db.objectStoreNames.contains(IMAGES)) {
        db.createObjectStore(IMAGES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(CELLS)) {
        db.createObjectStore(CELLS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

export function requestValue<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
  })
}

export function relaxedTx(db: IDBDatabase, stores: string[]): IDBTransaction {
  try {
    return db.transaction(stores, 'readwrite', { durability: 'relaxed' })
  } catch {
    return db.transaction(stores, 'readwrite')
  }
}

export const stores = { PROJECTS, IMAGES, CELLS }
