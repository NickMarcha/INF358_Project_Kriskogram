export type StoredSnapshot = {
  timestamp: number
  nodes: any[]
  edges: any[]
}

export type DatasetMetadata = {
  nodeProperties: string[] // e.g., ['region', 'population', 'economic_index', 'latitude', 'longitude']
  edgeProperties: string[] // e.g., ['migration_type', 'distance_km', 'economic_factor']
  hasNumericProperties: {
    nodes: string[] // numeric node properties like 'population', 'economic_index'
    edges: string[] // numeric edge properties
  }
  hasCategoricalProperties: {
    nodes: string[] // categorical node properties like 'region', 'division'
    edges: string[] // categorical edge properties like 'migration_type'
  }
}

export type StoredDataset = {
  id: string
  name: string
  description?: string
  filename?: string  // Original filename from import
  notes?: string     // User-provided notes
  type: 'csv' | 'gexf' | 'manual'
  timeRange: { start: number; end: number }
  snapshots: StoredSnapshot[]
  metadata?: DatasetMetadata // Detected properties for dynamic UI
  createdAt: number
}

/**
 * Detect all properties in nodes and edges for metadata
 */
export function detectDatasetProperties(snapshot: StoredSnapshot): DatasetMetadata {
  const nodeProperties = new Set<string>()
  const edgeProperties = new Set<string>()
  const numericNodeProps = new Set<string>()
  const numericEdgeProps = new Set<string>()
  const categoricalNodeProps = new Set<string>()
  const categoricalEdgeProps = new Set<string>()

  // Scan all nodes
  snapshot.nodes.forEach(node => {
    Object.keys(node).forEach(key => {
      if (key !== 'id' && key !== 'label') {
        nodeProperties.add(key)
        const value = node[key]
        if (typeof value === 'number') {
          numericNodeProps.add(key)
        } else if (typeof value === 'string') {
          categoricalNodeProps.add(key)
        }
      }
    })
  })

  // Scan all edges
  snapshot.edges.forEach(edge => {
    Object.keys(edge).forEach(key => {
      if (key !== 'source' && key !== 'target' && key !== 'value') {
        edgeProperties.add(key)
        const value = edge[key]
        if (typeof value === 'number') {
          numericEdgeProps.add(key)
        } else if (typeof value === 'string') {
          categoricalEdgeProps.add(key)
        }
      }
    })
  })

  return {
    nodeProperties: Array.from(nodeProperties),
    edgeProperties: Array.from(edgeProperties),
    hasNumericProperties: {
      nodes: Array.from(numericNodeProps),
      edges: Array.from(numericEdgeProps),
    },
    hasCategoricalProperties: {
      nodes: Array.from(categoricalNodeProps),
      edges: Array.from(categoricalEdgeProps),
    },
  }
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


