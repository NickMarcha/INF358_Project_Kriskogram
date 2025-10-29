import { useEffect, useRef, useState } from 'react'
import type { StoredDataset } from '../lib/storage'
import { getAllDatasets, saveDataset, detectDatasetProperties } from '../lib/storage'
import { parseStateMigrationCSV } from '../lib/csv-parser'
import { parseGexf, gexfToKriskogramSnapshots } from '../lib/gexf-parser'
import ImportPanel from './ImportPanel'

interface DatasetSidebarProps {
  selectedId?: string
  onSelect: (id: string) => void
}

export default function DatasetSidebar({ selectedId, onSelect }: DatasetSidebarProps) {
  const [datasets, setDatasets] = useState<StoredDataset[]>([])
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [importFile, setImportFile] = useState<{
    file: File
    content: string
    type: 'csv' | 'gexf'
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

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const fileName = file.name.toLowerCase()
      let parsedData: {
        nodes: any[]
        edges: any[]
        timeRange?: { start: number; end: number }
      } | undefined

      if (fileName.endsWith('.csv')) {
        const parsed = parseStateMigrationCSV(text)
        parsedData = {
          nodes: parsed.nodes as any[],
          edges: parsed.edges as any[],
          timeRange: { start: 2021, end: 2021 },
        }
        setImportFile({ file, content: text, type: 'csv', parsedData })
        setShowImportPanel(true)
      } else if (fileName.endsWith('.gexf')) {
        const graph = parseGexf(text)
        const snaps = gexfToKriskogramSnapshots(graph)
        parsedData = {
          nodes: snaps.length > 0 ? snaps[0].nodes : [],
          edges: snaps.length > 0 ? snaps[0].edges : [],
          timeRange: graph.timeRange,
        }
        setImportFile({ file, content: text, type: 'gexf', parsedData })
        setShowImportPanel(true)
      } else {
        alert('Unsupported file type. Please use .csv or .gexf files.')
        return
      }
    } catch (error) {
      alert(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleImport(datasetData: Omit<StoredDataset, 'id' | 'createdAt'>) {
    if (!importFile) return

    try {
      // Re-parse if needed to get all snapshots for GEXF
      let snapshots: any[]
      let metadata

      if (importFile.type === 'csv') {
        const parsed = parseStateMigrationCSV(importFile.content)
        const snapshot = { timestamp: datasetData.timeRange.start, nodes: parsed.nodes as any[], edges: parsed.edges as any[] }
        metadata = detectDatasetProperties(snapshot)
        snapshots = [snapshot]
      } else {
        const graph = parseGexf(importFile.content)
        snapshots = gexfToKriskogramSnapshots(graph) as any[]
        metadata = snapshots.length > 0 ? detectDatasetProperties(snapshots[0]) : undefined
      }

      const id = `${importFile.type}-${Date.now()}`
      const dataset: StoredDataset = {
        ...datasetData,
        id,
        snapshots,
        metadata,
        createdAt: Date.now(),
      }

      await saveDataset(dataset)
      await refresh()
      setShowImportPanel(false)
      setImportFile(null)
      onSelect(id)
    } catch (error) {
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
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Import Dataset
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.gexf"
          onChange={handleFileSelect}
          className="hidden"
        />
        {showImportPanel && importFile && (
          <ImportPanel
            onClose={() => {
              setShowImportPanel(false)
              setImportFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            onImport={handleImport}
            fileName={importFile.file.name}
            fileType={importFile.type}
            fileContent={importFile.content}
            parsedData={importFile.parsedData}
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


