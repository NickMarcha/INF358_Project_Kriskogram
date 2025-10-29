import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Kriskogram from '../components/Kriskogram'
import type { KriskogramRef } from '../components/Kriskogram'
import DatasetSidebar from '../components/DatasetSidebar'
import TableView from '../components/views/TableView'
import SankeyView from '../components/views/SankeyView'
import ChordView from '../components/views/ChordView'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ensurePersistentStorage, getDataset, saveDataset, detectDatasetProperties, type StoredDataset } from '../lib/storage'
import { loadCSVFromUrl, parseStateMigrationCSV } from '../lib/csv-parser'
import { parseTwoFileCSV } from '../lib/csv-two-file-parser'
import { gexfToKriskogramSnapshots, loadGexfFromUrl, type KriskogramSnapshot } from '../lib/gexf-parser'
import { filterEdgesByProperty, getUniqueEdgePropertyValues } from '../lib/data-adapters'

type ViewType = 'kriskogram' | 'table' | 'sankey' | 'chord'

export const Route = createFileRoute('/explorer')({
  component: ExplorerPage,
})

function ExplorerPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [dataset, setDataset] = useState<StoredDataset | undefined>(undefined)
  const [currentYear, setCurrentYear] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0) // Force refresh counter
  const [minThreshold, setMinThreshold] = useState(0)
  const [maxThreshold, setMaxThreshold] = useState(200000)
  const [maxEdges, setMaxEdges] = useState(500)
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string | null>(null)
  const [viewType, setViewType] = useState<ViewType>('kriskogram')
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
    if (!selectedId) {
      setDataset(undefined)
      return
    }
    setLoading(true)
    setError(null)
    getDataset(selectedId)
      .then((d) => {
        setDataset(d)
        if (d) {
          setCurrentYear(d.timeRange.start)
          // Reset filters when switching datasets
          setMinThreshold(0)
          setMaxEdges(500)
          // Max threshold will be adjusted when snapshot loads
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dataset'))
      .finally(() => setLoading(false))
  }, [selectedId, refreshKey]) // Include refreshKey to force reload

  const currentSnapshot: KriskogramSnapshot | undefined = useMemo(() => {
    if (!dataset || currentYear === undefined) return undefined
    // Find snapshot matching the year (handle both number and string timestamps)
    return dataset.snapshots.find(s => {
      const ts = typeof s.timestamp === 'string' ? parseInt(s.timestamp, 10) : s.timestamp
      return ts === currentYear
    }) as any
  }, [dataset, currentYear])

  // Auto-adjust max threshold and reset filters when snapshot changes
  useEffect(() => {
    if (currentSnapshot && currentSnapshot.edges.length > 0) {
      const maxValue = Math.max(...currentSnapshot.edges.map((e: any) => e.value))
      const minValue = Math.min(...currentSnapshot.edges.map((e: any) => e.value))
      // Reset to show all data when snapshot changes
      setMinThreshold(minValue)
      setMaxThreshold(Math.max(maxValue, minValue))
      setMaxEdges(Math.min(500, currentSnapshot.edges.length)) // Reset to total edges or 500, whichever is smaller
    }
  }, [currentSnapshot])

  // Get available edge type property (e.g., migration_type) and values
  const edgeTypeInfo = useMemo(() => {
    if (!currentSnapshot || !dataset?.metadata) return null
    
    // Look for common edge type properties
    const possibleProps = ['migration_type', 'type', 'category', 'edge_type']
    const prop = possibleProps.find(p => 
      dataset.metadata?.edgeProperties.includes(p) ||
      dataset.metadata?.hasCategoricalProperties.edges.includes(p)
    )
    
    if (!prop) return null
    
    const values = getUniqueEdgePropertyValues(currentSnapshot.edges, prop)
    return { property: prop, values: values.map(v => String(v)) }
  }, [currentSnapshot, dataset])

  // Reset edge type filter when dataset changes
  useEffect(() => {
    setEdgeTypeFilter(null)
  }, [selectedId])

  // Calculate filtered edges and nodes
  const filteredData = useMemo(() => {
    if (!currentSnapshot) return { nodes: [], edges: [] }
    
    // First filter by edge type if selected
    let edgesToFilter = filterEdgesByProperty(
      currentSnapshot.edges as any[],
      edgeTypeInfo?.property || '',
      edgeTypeFilter
    )
    
    // Then filter by value thresholds and limit
    const filteredEdges = edgesToFilter
      .filter((e: any) => e.value >= minThreshold && e.value <= maxThreshold)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, maxEdges)
    
    const activeNodeIds = new Set<string>()
    filteredEdges.forEach((e: any) => {
      activeNodeIds.add(e.source)
      activeNodeIds.add(e.target)
    })
    
    const filteredNodes = currentSnapshot.nodes.filter((n: any) => activeNodeIds.has(n.id))
    
    return { nodes: filteredNodes, edges: filteredEdges }
  }, [currentSnapshot, minThreshold, maxThreshold, maxEdges, edgeTypeFilter, edgeTypeInfo])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!currentSnapshot) return null
    
    const totalEdges = currentSnapshot.edges.length
    const totalNodes = currentSnapshot.nodes.length
    const totalValue = currentSnapshot.edges.reduce((sum: number, e: any) => sum + e.value, 0)
    const avgValue = totalEdges > 0 ? totalValue / totalEdges : 0
    const maxValue = totalEdges > 0 ? Math.max(...currentSnapshot.edges.map((e: any) => e.value)) : 0
    
    return {
      totalNodes,
      totalEdges,
      visibleNodes: filteredData.nodes.length,
      visibleEdges: filteredData.edges.length,
      avgValue,
      maxValue,
    }
  }, [currentSnapshot, filteredData])

  // Update visualization when filtered data changes (only for kriskogram view)
  useEffect(() => {
    if (viewType === 'kriskogram' && filteredData.nodes.length > 0 && filteredData.edges.length > 0 && krRef.current) {
      krRef.current.updateData(filteredData.nodes, filteredData.edges)
    }
  }, [filteredData, viewType])

  const handleYearChange = (year: number) => {
    setCurrentYear(year)
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg mx-4">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Explorer Error</h2>
            <p className="text-gray-700 mb-4">The explorer page encountered an error. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: 600 }}>
          <ErrorBoundary
            fallback={
              <div className="w-72 bg-white border-r border-gray-200 p-4">
                <h2 className="text-lg font-bold text-red-800 mb-2">Dataset Sidebar Error</h2>
                <p className="text-sm text-red-700">The dataset sidebar encountered an error.</p>
              </div>
            }
          >
            <DatasetSidebar 
              selectedId={selectedId} 
              onSelect={setSelectedId}
              onRefresh={() => setRefreshKey(prev => prev + 1)}
            />
          </ErrorBoundary>

          <main className="flex-1 p-6">
            <header className="mb-4">
              <h1 className="text-2xl font-bold">Explorer</h1>
              <p className="text-gray-600 text-sm">Load, store, and explore datasets locally</p>
            </header>

            {loading && <div className="p-4">Loading…</div>}
            {error && <div className="p-4 text-red-600">{error}</div>}

            {dataset && (
              <div className="space-y-4">
                {/* View Type Selector */}
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Visualization Type</label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setViewType('kriskogram')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
                        viewType === 'kriskogram'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Kriskogram
                    </button>
                    <button
                      onClick={() => setViewType('table')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
                        viewType === 'table'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setViewType('sankey')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
                        viewType === 'sankey'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Sankey
                    </button>
                    <button
                      onClick={() => setViewType('chord')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
                        viewType === 'chord'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Chord
                    </button>
                  </div>
                </div>

                {/* Statistics Panel */}
                {stats && (
                  <div className="p-4 bg-gray-50 rounded grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Nodes</div>
                      <div className="text-2xl font-bold">{stats.totalNodes}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Edges</div>
                      <div className="text-2xl font-bold">{stats.totalEdges.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Visible Nodes</div>
                      <div className="text-2xl font-bold">{stats.visibleNodes}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Visible Edges</div>
                      <div className="text-2xl font-bold">{stats.visibleEdges}</div>
                    </div>
                  </div>
                )}

                {/* Dataset Info and Controls */}
                <div className="p-4 bg-gray-50 rounded space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{dataset.name}</div>
                      <div className="text-xs text-gray-600">{dataset.type.toUpperCase()} · {dataset.timeRange.start}{dataset.timeRange.end !== dataset.timeRange.start ? `–${dataset.timeRange.end}` : ''}</div>
                    </div>
                  </div>

                  {/* Year Slider */}
                  {hasTime && currentYear !== undefined && (
                    <div className="flex items-center space-x-3">
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

                  {/* Edge Type Filter */}
                  {edgeTypeInfo && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Edge Type ({edgeTypeInfo.property})
                      </label>
                      <select
                        value={edgeTypeFilter || 'all'}
                        onChange={(e) => setEdgeTypeFilter(e.target.value === 'all' ? null : e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Types (Total)</option>
                        {edgeTypeInfo.values.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Filtering Controls */}
                  {currentSnapshot && stats && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            Min Threshold: {minThreshold.toLocaleString()}
                          </label>
                          {(() => {
                            const minValue = Math.min(...currentSnapshot.edges.map((e: any) => e.value))
                            const isFiltered = 
                              minThreshold > minValue || 
                              maxThreshold < stats.maxValue || 
                              maxEdges < stats.totalEdges
                            return (
                              <button
                                onClick={() => {
                                  setMinThreshold(minValue)
                                  setMaxThreshold(stats.maxValue)
                                  setMaxEdges(Math.max(500, stats.totalEdges))
                                }}
                                disabled={!isFiltered}
                                type="button"
                                className={`text-xs transition-colors ${isFiltered ? 'text-blue-600 hover:text-blue-800 font-semibold cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Show All
                              </button>
                            )
                          })()}
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={stats.maxValue || 200000}
                          step={Math.max(1, Math.floor((stats.maxValue || 200000) / 1000))}
                          value={minThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            setMinThreshold(Math.min(val, maxThreshold))
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0</span>
                          <span>Avg: {Math.round(stats.avgValue).toLocaleString()}</span>
                          <span>Max: {stats.maxValue.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Max Threshold: {maxThreshold.toLocaleString()}
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={stats.maxValue || 200000}
                          step={Math.max(1, Math.floor((stats.maxValue || 200000) / 1000))}
                          value={maxThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            setMaxThreshold(Math.max(val, minThreshold))
                          }}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Max Edges to Display: {maxEdges}
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={Math.max(500, stats.totalEdges)}
                          step={10}
                          value={maxEdges}
                          onChange={(e) => setMaxEdges(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Min: 10</span>
                          <span>Total: {stats.totalEdges.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-4">
                  {filteredData.nodes.length > 0 && filteredData.edges.length > 0 ? (
                    <>
                      {viewType === 'kriskogram' && (
                        <ErrorBoundary
                          fallback={
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                              <h3 className="text-lg font-semibold text-red-800 mb-2">Kriskogram Error</h3>
                              <p className="text-sm text-red-700">The Kriskogram visualization encountered an error.</p>
                            </div>
                          }
                        >
                          <Kriskogram
                            ref={krRef}
                            nodes={filteredData.nodes}
                            edges={filteredData.edges}
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
                        </ErrorBoundary>
                      )}
                      {viewType === 'table' && (
                        <ErrorBoundary
                          fallback={
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                              <h3 className="text-lg font-semibold text-red-800 mb-2">Table View Error</h3>
                              <p className="text-sm text-red-700">The table view encountered an error.</p>
                            </div>
                          }
                        >
                          <TableView nodes={filteredData.nodes} edges={filteredData.edges} />
                        </ErrorBoundary>
                      )}
                      {viewType === 'sankey' && (
                        <ErrorBoundary
                          fallback={
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                              <h3 className="text-lg font-semibold text-red-800 mb-2">Sankey Diagram Error</h3>
                              <p className="text-sm text-red-700">The Sankey diagram encountered an error.</p>
                            </div>
                          }
                        >
                          <SankeyView nodes={filteredData.nodes} edges={filteredData.edges} width={1000} height={600} />
                        </ErrorBoundary>
                      )}
                      {viewType === 'chord' && (
                        <ErrorBoundary
                          fallback={
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                              <h3 className="text-lg font-semibold text-red-800 mb-2">Chord Diagram Error</h3>
                              <p className="text-sm text-red-700">The chord diagram encountered an error.</p>
                            </div>
                          }
                        >
                          <ChordView nodes={filteredData.nodes} edges={filteredData.edges} width={1000} height={600} />
                        </ErrorBoundary>
                      )}
                    </>
                  ) : currentSnapshot ? (
                    <div className="text-center text-gray-500 py-8">
                      No data meets the current threshold range ({minThreshold.toLocaleString()} - {maxThreshold.toLocaleString()}). Try adjusting the filters.
                    </div>
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
    </ErrorBoundary>
  )
}

async function preloadDefaults(): Promise<string | undefined> {
  // Preload three defaults if missing: CSV 2021, sample GEXF, and Swiss Relocations
  const csvId = 'csv-2021'
  const gexfId = 'gexf-sample'
  const swissId = 'swiss-2016'

  const existingCsv = await getDataset(csvId)
  const existingGexf = await getDataset(gexfId)
  const existingSwiss = await getDataset(swissId)

  if (!existingCsv) {
    const csvUrl = new URL('../data/State_to_State_Migrations_Table_2021.csv', import.meta.url)
    const csvText = await loadCSVFromUrl(csvUrl.toString())
    const parsed = parseStateMigrationCSV(csvText)
    const snapshot = { timestamp: 2021, nodes: parsed.nodes as any[], edges: parsed.edges as any[] }
    const metadata = detectDatasetProperties(snapshot)
    const ds: StoredDataset = {
      id: csvId,
      name: 'US State-to-State Migration (2021)',
      notes: 'Census 2021 state-to-state migration estimates (single snapshot)',
      type: 'csv',
      timeRange: { start: 2021, end: 2021 },
      snapshots: [snapshot],
      metadata,
      createdAt: Date.now(),
    }
    await saveDataset(ds)
  }

  if (!existingGexf) {
    const gexfUrl = new URL('../data/sample-migration-data.gexf', import.meta.url)
    const graph = await loadGexfFromUrl(gexfUrl.toString())
    const snaps = gexfToKriskogramSnapshots(graph)
    const metadata = snaps.length > 0 ? detectDatasetProperties(snaps[0]) : undefined
    const ds: StoredDataset = {
      id: gexfId,
      name: 'Sample Migration (GEXF)',
      notes: 'Sample network with time slices parsed from GEXF',
      type: 'gexf',
      timeRange: graph.timeRange,
      snapshots: snaps as any,
      metadata,
      createdAt: Date.now(),
    }
    await saveDataset(ds)
  }

  if (!existingSwiss) {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const locationsUrl = `${baseUrl}data/Swiss_Relocations_2016_locations.csv`
    const flowsUrl = `${baseUrl}data/Swiss_Relocations_2016_flows.csv`
    
    const locationsText = await loadCSVFromUrl(locationsUrl)
    const flowsText = await loadCSVFromUrl(flowsUrl)
    
    const parsed = parseTwoFileCSV({
      nodesFile: {
        content: locationsText,
        idField: 'id',
        labelField: 'name',
      },
      edgesFile: {
        content: flowsText,
        sourceField: 'origin',
        targetField: 'dest',
        valueField: 'count',
      },
    })
    
    const snapshot = { timestamp: 2016, nodes: parsed.nodes as any[], edges: parsed.edges as any[] }
    const metadata = detectDatasetProperties(snapshot)
    const ds: StoredDataset = {
      id: swissId,
      name: 'Swiss Relocations (2016)',
      notes: 'Relocations between Swiss cantons in 2016 (two-file CSV format)',
      type: 'csv-two-file',
      timeRange: { start: 2016, end: 2016 },
      snapshots: [snapshot],
      metadata,
      createdAt: Date.now(),
    }
    await saveDataset(ds)
  }

  return csvId
}

