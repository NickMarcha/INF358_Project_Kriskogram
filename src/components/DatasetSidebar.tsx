import { useEffect, useRef, useState } from 'react'
import type { StoredDataset } from '../lib/storage'
import { getAllDatasets, saveDataset } from '../lib/storage'
import ImportPanel from './ImportPanel'

interface DatasetSidebarProps {
  selectedId?: string
  onSelect: (id: string) => void
}

export default function DatasetSidebar({ selectedId, onSelect }: DatasetSidebarProps) {
  const [datasets, setDatasets] = useState<StoredDataset[]>([])
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [importFile, setImportFile] = useState<{
    files: File[]
    contents: string[]
    type: 'csv' | 'gexf' | 'csv-two-file'
    parsedData?: {
      nodes: any[]
      edges: any[]
      timeRange?: { start: number; end: number }
    }
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const all = await getAllDatasets()
    setDatasets(all)
  }

  // File selection is now handled within ImportPanel

  async function handleImport(
    datasetData: Omit<StoredDataset, 'id' | 'createdAt'>,
    parsedResult: {
      nodes: any[]
      edges: any[]
      snapshots: any[]
      metadata?: any
    }
  ) {
    try {
      // Use dataset type for ID generation
      const type = datasetData.type || 'csv'
      const id = `${type}-${Date.now()}`
      const dataset: StoredDataset = {
        ...datasetData,
        id,
        snapshots: parsedResult.snapshots,
        metadata: parsedResult.metadata,
        createdAt: Date.now(),
      }

      await saveDataset(dataset)
      await refresh()
      setShowImportPanel(false)
      setImportFile(null)
      onSelect(id)
    } catch (error) {
      console.error('Import error:', error)
      throw error
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <aside className="w-72 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Datasets</h2>
        <p className="text-xs text-gray-500">Stored in your browser</p>
        <button
          onClick={() => setShowImportPanel(true)}
          className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Import Dataset
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.gexf"
          multiple
          className="hidden"
        />
        {showImportPanel && (
          <ImportPanel
            onClose={() => {
              setShowImportPanel(false)
              setImportFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            onImport={handleImport}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            onFilesSelected={setImportFile}
            existingFile={importFile}
          />
        )}
      </div>
      <ul className="divide-y flex-1 overflow-y-auto">
        {datasets.map((d) => (
          <li key={d.id}>
            <button
              className={`w-full text-left p-3 hover:bg-gray-50 ${selectedId === d.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(d.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.type.toUpperCase()} · {d.timeRange.start}{d.timeRange.end !== d.timeRange.start ? `–${d.timeRange.end}` : ''}</div>
                </div>
              </div>
              {d.description && (
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{d.description}</div>
              )}
            </button>
          </li>
        ))}
        {datasets.length === 0 && (
          <li className="p-3 text-sm text-gray-500">No datasets yet</li>
        )}
      </ul>
    </aside>
  )
}


