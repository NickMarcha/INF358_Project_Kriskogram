export type StoredSnapshot = {
  timestamp: number
  nodes: any[]
  edges: any[]
}

export type StoredDataset = {
  id: string
  name: string
  description?: string
  type: 'csv' | 'gexf' | 'manual'
  timeRange: { start: number; end: number }
  snapshots: StoredSnapshot[]
  createdAt: number
}

const DB_NAME = 'kriskogram-db'
const DB_VERSION = 1
const STORE_DATASETS = 'datasets'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_DATASETS)) {
        db.createObjectStore(STORE_DATASETS, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveDataset(dataset: StoredDataset): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASETS, 'readwrite')
    const store = tx.objectStore(STORE_DATASETS)
    store.put(dataset)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function getDataset(id: string): Promise<StoredDataset | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASETS, 'readonly')
    const store = tx.objectStore(STORE_DATASETS)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result as StoredDataset | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllDatasets(): Promise<StoredDataset[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASETS, 'readonly')
    const store = tx.objectStore(STORE_DATASETS)
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result || []) as StoredDataset[])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASETS, 'readwrite')
    const store = tx.objectStore(STORE_DATASETS)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function ensurePersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      // Ask for persistence; returns true if already persistent or granted
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const granted = await navigator.storage.persist()
      return granted
    } catch {
      return false
    }
  }
  return false
}


