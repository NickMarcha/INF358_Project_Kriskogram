import { useEffect, useRef, useState } from 'react'
import type { StoredDataset } from '../lib/storage'
import { getAllDatasets, saveDataset, deleteDataset, duplicateDataset, clearAllDatasets, getDataset } from '../lib/storage'
import ImportPanel from './ImportPanel'
import EditPanel from './EditPanel'

interface DatasetSidebarProps {
  selectedId?: string
  onSelect: (id: string) => void
}

export default function DatasetSidebar({ selectedId, onSelect }: DatasetSidebarProps) {
  const [datasets, setDatasets] = useState<StoredDataset[]>([])
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [editingDataset, setEditingDataset] = useState<StoredDataset | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
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

  async function handleEdit(datasetId: string, e: React.MouseEvent) {
    e.stopPropagation()
    const dataset = await getDataset(datasetId)
    if (dataset) {
      setEditingDataset(dataset)
    }
  }

  async function handleSave(updated: StoredDataset) {
    await saveDataset(updated)
    await refresh()
    if (selectedId === updated.id) {
      onSelect(updated.id) // Refresh selection
    }
  }

  async function handleDelete() {
    if (!editingDataset) return
    await deleteDataset(editingDataset.id)
    await refresh()
    if (selectedId === editingDataset.id) {
      onSelect('') // Clear selection if deleted
    }
    setEditingDataset(null)
  }

  async function handleDuplicate() {
    if (!editingDataset) return
    const duplicate = await duplicateDataset(editingDataset.id)
    await refresh()
    setEditingDataset(null)
    onSelect(duplicate.id)
  }

  async function handleResetStorage() {
    await clearAllDatasets()
    await refresh()
    setShowResetConfirm(false)
    onSelect('')
    // Trigger page reload to reinitialize defaults
    window.location.reload()
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
            <div className={`flex items-center group ${selectedId === d.id ? 'bg-blue-50' : ''}`}>
              <button
                className="flex-1 text-left p-3 hover:bg-gray-50"
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
              <button
                onClick={(e) => handleEdit(d.id, e)}
                className="px-2 py-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-all mr-2"
                title="Edit dataset"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </li>
        ))}
        {datasets.length === 0 && (
          <li className="p-3 text-sm text-gray-500">No datasets yet</li>
        )}
      </ul>
      
      {/* Reset Storage Button */}
      <div className="p-4 border-t">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Reset All Data
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Delete all datasets and reload defaults
        </p>
      </div>

      {/* Edit Panel */}
      {editingDataset && (
        <EditPanel
          dataset={editingDataset}
          onClose={() => setEditingDataset(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold mb-2">Reset All Data?</h3>
            <p className="text-gray-600 mb-4">
              This will delete all datasets and reload the default test data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetStorage}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}


