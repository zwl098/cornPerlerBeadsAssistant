import { getDb, relaxedTx, requestValue, stores, txDone } from './db'
import type { CellsRecord, ImageRecord, ProjectRecord } from './types'

export async function putProject(record: ProjectRecord): Promise<void> {
  const db = await getDb()
  const tx = relaxedTx(db, [stores.PROJECTS])
  tx.objectStore(stores.PROJECTS).put(record)
  await txDone(tx)
}

export async function putImage(record: ImageRecord): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(stores.IMAGES, 'readwrite')
  tx.objectStore(stores.IMAGES).put(record)
  await txDone(tx)
}

export async function putCells(id: string, completed: Int32Array): Promise<void> {
  const db = await getDb()
  const tx = relaxedTx(db, [stores.CELLS])
  const row: CellsRecord = { id, completed }
  tx.objectStore(stores.CELLS).put(row)
  await txDone(tx)
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  const db = await getDb()
  const tx = db.transaction(stores.PROJECTS, 'readonly')
  return requestValue(tx.objectStore(stores.PROJECTS).get(id))
}

export async function getImage(id: string): Promise<ImageRecord | undefined> {
  const db = await getDb()
  const tx = db.transaction(stores.IMAGES, 'readonly')
  return requestValue(tx.objectStore(stores.IMAGES).get(id))
}

export async function getCells(id: string): Promise<Int32Array> {
  const db = await getDb()
  const tx = db.transaction(stores.CELLS, 'readonly')
  const row = await requestValue<CellsRecord | undefined>(tx.objectStore(stores.CELLS).get(id))
  const raw: unknown = row?.completed
  if (raw instanceof Int32Array) return raw
  if (ArrayBuffer.isView(raw)) return Int32Array.from(raw as unknown as ArrayLike<number>)
  if (Array.isArray(raw)) return Int32Array.from(raw as number[])
  return new Int32Array()
}

export async function listRecent(limit: number): Promise<ProjectRecord[]> {
  const db = await getDb()
  const tx = db.transaction(stores.PROJECTS, 'readonly')
  const index = tx.objectStore(stores.PROJECTS).index('lastUsedAt')
  const rows: ProjectRecord[] = []
  await new Promise<void>((resolve, reject) => {
    const cursorReq = index.openCursor(null, 'prev')
    cursorReq.onerror = () => reject(cursorReq.error ?? new Error('cursor failed'))
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (!cursor || rows.length >= limit) {
        resolve()
        return
      }
      rows.push(cursor.value as ProjectRecord)
      cursor.continue()
    }
  })
  return rows
}

export async function touchLastUsed(id: string, at = Date.now()): Promise<void> {
  const record = await getProject(id)
  if (!record) return
  await putProject({ ...record, lastUsedAt: at })
}
