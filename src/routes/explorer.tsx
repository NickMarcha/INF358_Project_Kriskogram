import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Kriskogram from '../components/Kriskogram'
import type { KriskogramRef } from '../components/Kriskogram'
import DatasetSidebar from '../components/DatasetSidebar'
import { ensurePersistentStorage, getDataset, saveDataset, type StoredDataset } from '../lib/storage'
import { loadCSVFromUrl, parseStateMigrationCSV } from '../lib/csv-parser'
import { gexfToKriskogramSnapshots, loadGexfFromUrl, type KriskogramSnapshot } from '../lib/gexf-parser'

export const Route = createFileRoute('/explorer')({
  component: ExplorerPage,
})

function ExplorerPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [dataset, setDataset] = useState<StoredDataset | undefined>(undefined)
  const [currentYear, setCurrentYear] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const krRef = useRef<KriskogramRef>(null)

  const hasTime = useMemo(() => {
    return dataset && dataset.timeRange.start !== dataset.timeRange.end
  }, [dataset])

  useEffect(() => {
    // Request persistent storage to reduce eviction risk
    ensurePersistentStorage().catch(() => {})
    preloadDefaults()
      .then((firstId) => {
        if (firstId) setSelectedId(firstId)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to preload datasets'))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    getDataset(selectedId)
      .then((d) => {
        setDataset(d)
        if (d) {
          setCurrentYear(d.timeRange.start)
          // initial render
          const snap = d.snapshots.find(s => s.timestamp === d.timeRange.start) || d.snapshots[0]
          if (snap && krRef.current) {
            krRef.current.updateData(snap.nodes, snap.edges)
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dataset'))
      .finally(() => setLoading(false))
  }, [selectedId])

  const currentSnapshot: KriskogramSnapshot | undefined = useMemo(() => {
    if (!dataset || currentYear === undefined) return undefined
    return dataset.snapshots.find(s => s.timestamp === currentYear) as any
  }, [dataset, currentYear])

  const handleYearChange = (year: number) => {
    setCurrentYear(year)
    const snap = dataset?.snapshots.find(s => s.timestamp === year)
    if (snap && krRef.current) {
      krRef.current.updateData(snap.nodes, snap.edges)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: 600 }}>
          <DatasetSidebar selectedId={selectedId} onSelect={setSelectedId} />

          <main className="flex-1 p-6">
            <header className="mb-4">
              <h1 className="text-2xl font-bold">Explorer</h1>
              <p className="text-gray-600 text-sm">Load, store, and explore datasets locally</p>
            </header>

            {loading && <div className="p-4">Loading…</div>}
            {error && <div className="p-4 text-red-600">{error}</div>}

            {dataset && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{dataset.name}</div>
                      <div className="text-xs text-gray-600">{dataset.type.toUpperCase()} · {dataset.timeRange.start}{dataset.timeRange.end !== dataset.timeRange.start ? `–${dataset.timeRange.end}` : ''}</div>
                    </div>
                  </div>
                  {hasTime && currentYear !== undefined && (
                    <div className="mt-4 flex items-center space-x-3">
                      <label className="text-sm font-medium">Year</label>
                      <input
                        type="range"
                        min={dataset.timeRange.start}
                        max={dataset.timeRange.end}
                        value={currentYear}
                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono">{currentYear}</span>
                    </div>
                  )}
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-4">
                  {currentSnapshot ? (
                    <Kriskogram
                      ref={krRef}
                      nodes={currentSnapshot.nodes}
                      edges={currentSnapshot.edges}
                      width={1000}
                      height={600}
                      margin={{ top: 60, right: 40, bottom: 60, left: 40 }}
                      accessors={{
                        nodeOrder: (d) => d.id,
                        nodeColor: (d) => {
                          if (d.economic_index) {
                            const hue = d.economic_index * 120; // Green to red scale
                            return `hsl(${hue}, 70%, 50%)`;
                          }
                          if (d.region && typeof d.region === 'string') {
                            // Use region-based coloring if available
                            const regionColors: Record<string, string> = {
                              'Northeast': '#3b82f6',
                              'Midwest': '#f59e0b',
                              'South': '#ef4444',
                              'West': '#10b981',
                            };
                            return regionColors[d.region] || '#555';
                          }
                          return '#555';
                        },
                        nodeRadius: (d) => {
                          if (d.population) {
                            return Math.sqrt(d.population) / 1000;
                          }
                          return 6;
                        },
                        edgeWidth: (e) => Math.sqrt(e.value) / 10,
                        edgeColor: (e, _isAbove) => {
                          if (!currentSnapshot) return '#1f77b4';
                          // Find min and max weights for color scaling
                          const weights = currentSnapshot.edges.map((edge: any) => edge.value);
                          const minWeight = Math.min(...weights);
                          const maxWeight = Math.max(...weights);
                          
                          // Normalize weight to 0-1 range
                          const normalized = (e.value - minWeight) / (maxWeight - minWeight);
                          
                          // Use single hue (light blue) with varying lightness
                          const hue = 200; // Light blue
                          const saturation = 70;
                          const lightness = 75 - (normalized * 50); // 75% (light) to 25% (dark)
                          
                          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                        },
                      }}
                    />
                  ) : (
                    <div className="text-gray-500 py-8">No snapshot to display</div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

async function preloadDefaults(): Promise<string | undefined> {
  // Preload two defaults if missing: CSV 2021 and sample GEXF
  // CSV: src/data/State_to_State_Migrations_Table_2021.csv
  const csvId = 'csv-2021'
  const gexfId = 'gexf-sample'

  const existingCsv = await getDataset(csvId)
  const existingGexf = await getDataset(gexfId)

  if (!existingCsv) {
    const csvUrl = new URL('../data/State_to_State_Migrations_Table_2021.csv', import.meta.url)
    const csvText = await loadCSVFromUrl(csvUrl.toString())
    const parsed = parseStateMigrationCSV(csvText)
    const ds: StoredDataset = {
      id: csvId,
      name: 'US State-to-State Migration (2021)',
      description: 'Census 2021 state-to-state migration estimates (single snapshot)',
      type: 'csv',
      timeRange: { start: 2021, end: 2021 },
      snapshots: [{ timestamp: 2021, nodes: parsed.nodes as any[], edges: parsed.edges as any[] }],
      createdAt: Date.now(),
    }
    await saveDataset(ds)
  }

  if (!existingGexf) {
    const gexfUrl = new URL('../data/sample-migration-data.gexf', import.meta.url)
    const graph = await loadGexfFromUrl(gexfUrl.toString())
    const snaps = gexfToKriskogramSnapshots(graph)
    const ds: StoredDataset = {
      id: gexfId,
      name: 'Sample Migration (GEXF)',
      description: 'Sample network with time slices parsed from GEXF',
      type: 'gexf',
      timeRange: graph.timeRange,
      snapshots: snaps as any,
      createdAt: Date.now(),
    }
    await saveDataset(ds)
  }

  return csvId
}

