import { useEffect, useRef, useState } from 'react'
import type { StoredDataset } from '../lib/storage'
import { getAllDatasets, saveDataset, detectDatasetProperties } from '../lib/storage'
import { parseStateMigrationCSV } from '../lib/csv-parser'
import { parseGexf, gexfToKriskogramSnapshots } from '../lib/gexf-parser'

interface DatasetSidebarProps {
  selectedId?: string
  onSelect: (id: string) => void
}

export default function DatasetSidebar({ selectedId, onSelect }: DatasetSidebarProps) {
  const [datasets, setDatasets] = useState<StoredDataset[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const all = await getAllDatasets()
    setDatasets(all)
  }

  async function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const fileName = file.name.toLowerCase()
      let dataset: StoredDataset

      if (fileName.endsWith('.csv')) {
        const parsed = parseStateMigrationCSV(text)
        const snapshot = { timestamp: 2021, nodes: parsed.nodes as any[], edges: parsed.edges as any[] }
        const metadata = detectDatasetProperties(snapshot)
        const id = `csv-${Date.now()}`
        dataset = {
          id,
          name: file.name.replace('.csv', ''),
          description: 'Imported CSV migration data',
          type: 'csv',
          timeRange: { start: 2021, end: 2021 },
          snapshots: [snapshot],
          metadata,
          createdAt: Date.now(),
        }
        await saveDataset(dataset)
        onSelect(id)
      } else if (fileName.endsWith('.gexf')) {
        const graph = parseGexf(text)
        const snaps = gexfToKriskogramSnapshots(graph)
        // Detect properties from first snapshot (assuming all snapshots have same structure)
        const metadata = snaps.length > 0 ? detectDatasetProperties(snaps[0]) : undefined
        const id = `gexf-${Date.now()}`
        dataset = {
          id,
          name: file.name.replace('.gexf', ''),
          description: 'Imported GEXF migration data',
          type: 'gexf',
          timeRange: graph.timeRange,
          snapshots: snaps as any,
          metadata,
          createdAt: Date.now(),
        }
        await saveDataset(dataset)
        onSelect(id)
      } else {
        alert('Unsupported file type. Please use .csv or .gexf files.')
        return
      }

      await refresh()
    } catch (error) {
      alert(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
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
          disabled={isImporting}
          className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? 'Importing...' : 'Import Dataset'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.gexf"
          onChange={handleFileImport}
          className="hidden"
        />
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


