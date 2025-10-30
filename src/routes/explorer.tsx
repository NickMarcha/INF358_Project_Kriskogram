import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { z } from 'zod'
import Kriskogram from '../components/Kriskogram'
import type { KriskogramRef } from '../components/Kriskogram'
import DatasetSidebar from '../components/DatasetSidebar'
import TableView from '../components/views/TableView'
import SankeyView from '../components/views/SankeyView'
import ChordView from '../components/views/ChordView'
import { ErrorBoundary } from '../components/ErrorBoundary'
import SettingsPanel from '../components/SettingsPanel'
import { useSidebar } from '../contexts/SidebarContext'
import { ensurePersistentStorage, getDataset, saveDataset, detectDatasetProperties, type StoredDataset } from '../lib/storage'
import { loadCSVFromUrl, parseStateMigrationCSV } from '../lib/csv-parser'
import { parseTwoFileCSV } from '../lib/csv-two-file-parser'
import { gexfToKriskogramSnapshots, loadGexfFromUrl, type KriskogramSnapshot } from '../lib/gexf-parser'
import { filterEdgesByProperty, getUniqueEdgePropertyValues } from '../lib/data-adapters'

type ViewType = 'kriskogram' | 'table' | 'sankey' | 'chord'

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  subtitle,
  children, 
  defaultOpen = false 
}: { 
  title: string
  subtitle?: string
  children: React.ReactNode | string | number | undefined
  defaultOpen?: boolean 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="font-semibold text-sm">{title}</div>
          {subtitle && (
            <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}

const viewTypeSchema = z.enum(['kriskogram', 'table', 'sankey', 'chord'])

// Helper function to coerce to number safely, returning undefined if invalid
const safeCoerceNumber = (defaultValue?: number) => {
  const schema = defaultValue !== undefined 
    ? z.number().default(defaultValue)
    : z.number().optional()
  
  return z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return defaultValue
      const num = typeof val === 'string' ? parseFloat(val) : Number(val)
      return Number.isNaN(num) ? defaultValue : num
    },
    schema
  )
}

const explorerSearchSchema = z.object({
  dataset: z.string().optional(),
  view: z.preprocess(
    (val) => {
      if (typeof val === 'string' && viewTypeSchema.safeParse(val).success) {
        return val
      }
      return 'kriskogram' // default
    },
    viewTypeSchema.default('kriskogram')
  ),
  year: safeCoerceNumber(undefined),
  minThreshold: safeCoerceNumber(0),
  maxThreshold: safeCoerceNumber(200000),
  maxEdges: safeCoerceNumber(500),
  edgeType: z.preprocess(
    (val) => {
      if (val === 'null' || val === '') return null
      return typeof val === 'string' ? val : undefined
    },
    z.string().nullable().optional()
  ),
})

type ExplorerSearchParams = z.infer<typeof explorerSearchSchema>


export const Route = createFileRoute('/explorer')({
  component: ExplorerPage,
  validateSearch: (search) => {
    // Use safeParse to handle validation errors gracefully
    const result = explorerSearchSchema.safeParse(search)
    if (result.success) {
      return result.data
    }
    
    // If validation fails, try to extract valid values and use defaults for invalid ones
    // This prevents the page from crashing on invalid search params
    const safeView = typeof search.view === 'string' && 
      ['kriskogram', 'table', 'sankey', 'chord'].includes(search.view)
      ? search.view as ViewType
      : 'kriskogram'
    
    const safeYear = (() => {
      if (search.year === undefined || search.year === null || search.year === '') return undefined
      const num = typeof search.year === 'string' ? parseFloat(search.year) : Number(search.year)
      return Number.isNaN(num) ? undefined : num
    })()
    
    const safeMinThreshold = (() => {
      if (search.minThreshold === undefined || search.minThreshold === null || search.minThreshold === '') return 0
      const num = typeof search.minThreshold === 'string' ? parseFloat(search.minThreshold) : Number(search.minThreshold)
      return Number.isNaN(num) ? 0 : num
    })()
    
    const safeMaxThreshold = (() => {
      if (search.maxThreshold === undefined || search.maxThreshold === null || search.maxThreshold === '') return 200000
      const num = typeof search.maxThreshold === 'string' ? parseFloat(search.maxThreshold) : Number(search.maxThreshold)
      return Number.isNaN(num) ? 200000 : num
    })()
    
    const safeMaxEdges = (() => {
      if (search.maxEdges === undefined || search.maxEdges === null || search.maxEdges === '') return 500
      const num = typeof search.maxEdges === 'string' ? parseFloat(search.maxEdges) : Number(search.maxEdges)
      return Number.isNaN(num) ? 500 : num
    })()
    
    const safeEdgeType = (() => {
      if (search.edgeType === 'null' || search.edgeType === '') return null
      return typeof search.edgeType === 'string' ? search.edgeType : undefined
    })()
    
    return {
      dataset: typeof search.dataset === 'string' ? search.dataset : undefined,
      view: safeView,
      year: safeYear,
      minThreshold: safeMinThreshold,
      maxThreshold: safeMaxThreshold,
      maxEdges: safeMaxEdges,
      edgeType: safeEdgeType,
    }
  },
  search: {
    // middlewares: [stripSearchParams(defaultSearchValues)], // Type issue - disabled for now
  },
})

function ExplorerPage() {
  const search = useSearch({ from: '/explorer' })
  const navigate = useNavigate()
  const { leftSidebarCollapsed, leftSidebarWidth, setSidebarContent } = useSidebar()
  
  // Initialize state from search params (Zod ensures we have proper types and defaults)
  const [selectedId, setSelectedId] = useState<string | undefined>(search.dataset)
  const [dataset, setDataset] = useState<StoredDataset | undefined>(undefined)
  const [currentYear, setCurrentYear] = useState<number | undefined>(search.year)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0) // Force refresh counter
  const [minThreshold, setMinThreshold] = useState(search.minThreshold ?? 0)
  const [maxThreshold, setMaxThreshold] = useState(search.maxThreshold ?? 200000)
  const [maxEdges, setMaxEdges] = useState(search.maxEdges ?? 500)
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string | null>(search.edgeType ?? null)
  const [viewType, setViewType] = useState<ViewType>(search.view)
  const krRef = useRef<KriskogramRef>(null)
  
  // Sidebar state for right panel
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(384)
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 })

  // Set sidebar content for explorer page (dataset panel)
  useEffect(() => {
    setSidebarContent(
      <ErrorBoundary
        fallback={
          <div className="p-4">
            <h2 className="text-lg font-bold text-red-800 mb-2">Dataset Sidebar Error</h2>
            <p className="text-sm text-red-700">The dataset sidebar encountered an error.</p>
          </div>
        }
      >
        <DatasetSidebar 
          selectedId={selectedId} 
          onSelect={(id) => {
            setSelectedId(id)
            updateSearchParams({ dataset: id })
          }}
          onRefresh={() => setRefreshKey(prev => prev + 1)}
        />
      </ErrorBoundary>
    )
    
    return () => {
      setSidebarContent(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, refreshKey])

  // Update window size on resize
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    handleResize() // Initial size
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Update window size when sidebars toggle or resize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Small delay to let layout adjust
      setTimeout(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      }, 100)
    }
  }, [leftSidebarCollapsed, rightSidebarCollapsed, leftSidebarWidth, rightSidebarWidth])
  
  // Kriskogram visualization controls (only used when viewType === 'kriskogram')
  const [nodeOrderMode, setNodeOrderMode] = useState<'alphabetical' | string>('alphabetical') // 'alphabetical' or property name
  const [arcOpacity, setArcOpacity] = useState(0.85)
  const [edgeWeightEncoding, setEdgeWeightEncoding] = useState<'color' | 'opacity' | 'width'>('width')
  const [baseEdgeWidth, setBaseEdgeWidth] = useState<number>(2)
  const [nodeColorMode, setNodeColorMode] = useState<'single' | 'attribute' | 'outgoing' | 'incoming'>('single')
  const [nodeColorAttribute, setNodeColorAttribute] = useState<string | null>(null) // Property name when mode is 'attribute'
  const [nodeSizeMode, setNodeSizeMode] = useState<'fixed' | 'attribute' | 'outgoing' | 'incoming'>('fixed')
  const [nodeSizeAttribute, setNodeSizeAttribute] = useState<string | null>(null) // Property name when mode is 'attribute'
  
  // Function to update search params when state changes
  // Uses functional update pattern - TanStack Router will merge with current search params
  // The stripSearchParams middleware will automatically remove default values from the URL
  const updateSearchParams = useMemo(() => {
    return (updates: Partial<ExplorerSearchParams>) => {
      navigate({
        to: '/explorer',
        search: (prev) => ({ 
          view: prev.view ?? 'kriskogram',
          ...prev, 
          ...updates 
        } as ExplorerSearchParams),
        replace: true,
      })
    }
  }, [navigate])

  const hasTime = useMemo(() => {
    return dataset && dataset.timeRange.start !== dataset.timeRange.end
  }, [dataset])
  
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Request persistent storage to reduce eviction risk
    ensurePersistentStorage().catch(() => {})
    preloadDefaults()
      .then((firstId) => {
        // Use search param dataset or default to firstId
        const idToUse = search.dataset || firstId
        if (idToUse) {
          setSelectedId(idToUse)
          if (!search.dataset && isInitialMount.current) {
            updateSearchParams({ dataset: idToUse })
          }
        }
        isInitialMount.current = false
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
    
    const filteredNodes = (currentSnapshot.nodes as any[]).filter((n: any) => activeNodeIds.has(n.id))
    
    // Compute dynamic attributes (total incoming/outgoing) for each node
    const nodeIncoming = new Map<string, number>()
    const nodeOutgoing = new Map<string, number>()
    
    filteredEdges.forEach((e: any) => {
      const outgoing = nodeOutgoing.get(e.source) || 0
      nodeOutgoing.set(e.source, outgoing + e.value)
      
      const incoming = nodeIncoming.get(e.target) || 0
      nodeIncoming.set(e.target, incoming + e.value)
    })
    
    // Add computed attributes to nodes
    const nodesWithDynamicAttrs = filteredNodes.map((n: any) => ({
      ...n,
      _totalIncoming: nodeIncoming.get(n.id) || 0,
      _totalOutgoing: nodeOutgoing.get(n.id) || 0,
    }))
    
    return { nodes: nodesWithDynamicAttrs, edges: filteredEdges }
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

  // Effective minimum value after applying thresholds and maxEdges (top-N)
  const effectiveMinEdgeValue = useMemo(() => {
    if (!filteredData || filteredData.edges.length === 0) return undefined as number | undefined
    return Math.min(...filteredData.edges.map((e: any) => e.value))
  }, [filteredData])

  const effectiveMaxEdgeValue = useMemo(() => {
    if (!filteredData || filteredData.edges.length === 0) return undefined as number | undefined
    return Math.max(...filteredData.edges.map((e: any) => e.value))
  }, [filteredData])

  // Update visualization when filtered data changes (only for kriskogram view)
  useEffect(() => {
    if (viewType === 'kriskogram' && filteredData.nodes.length > 0 && filteredData.edges.length > 0 && krRef.current) {
      krRef.current.updateData(filteredData.nodes, filteredData.edges)
    }
  }, [filteredData, viewType])

  const handleYearChange = (year: number) => {
    setCurrentYear(year)
    if (!isInitialMount.current) {
      updateSearchParams({ year })
    }
  }
  
  // Update search params when filters change (only after initial mount)
  useEffect(() => {
    if (!isInitialMount.current) {
      updateSearchParams({
        minThreshold,
        maxThreshold,
        maxEdges,
      })
    }
  }, [minThreshold, maxThreshold, maxEdges])
  
  // Update search params when view type changes
  useEffect(() => {
    if (!isInitialMount.current) {
      updateSearchParams({ view: viewType })
    }
  }, [viewType])
  
  // Update search params when edge type filter changes
  useEffect(() => {
    if (!isInitialMount.current) {
      updateSearchParams({ edgeType: edgeTypeFilter })
    }
  }, [edgeTypeFilter])
  
  // Update search params when dataset changes
  useEffect(() => {
    if (!isInitialMount.current && selectedId) {
      updateSearchParams({ dataset: selectedId })
    }
  }, [selectedId])

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
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Center Content - Visualization */}
        <main className="flex-1 flex flex-col overflow-hidden h-full">
          {loading && <div className="p-4 bg-yellow-50 text-yellow-800">Loading…</div>}
          {error && <div className="p-4 bg-red-50 text-red-600">{error}</div>}

            {dataset ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className={`flex-1 overflow-hidden ${viewType === 'table' ? '' : 'p-4'}`}>
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
                          <div className="w-full h-full">
                            <Kriskogram
                              ref={krRef}
                              nodes={filteredData.nodes}
                              edges={filteredData.edges}
                              width={Math.max(800, windowSize.width - (leftSidebarCollapsed ? 64 : leftSidebarWidth) - (rightSidebarCollapsed ? 4 : rightSidebarWidth) - 40)}
                              height={Math.max(600, windowSize.height - 80)}
                              margin={{ top: 60, right: 40, bottom: 60, left: 40 }}
                              arcOpacity={arcOpacity}
                              title={dataset.name}
                              accessors={(() => {
                              // Compute edge weight min/max for scaling
                              const edgeWeights = filteredData.edges.map((e: any) => e.value)
                              const minEdgeWeight = edgeWeights.length > 0 ? Math.min(...edgeWeights) : 0
                              const maxEdgeWeight = edgeWeights.length > 0 ? Math.max(...edgeWeights) : 1
                              const edgeWeightRange = maxEdgeWeight - minEdgeWeight || 1
                              
                              // Compute node attribute ranges for color/size scaling
                              const nodeOutgoingValues = filteredData.nodes.map((n: any) => n._totalOutgoing || 0)
                              const nodeIncomingValues = filteredData.nodes.map((n: any) => n._totalIncoming || 0)
                              const maxOutgoing = nodeOutgoingValues.length > 0 ? Math.max(...nodeOutgoingValues) : 1
                              const maxIncoming = nodeIncomingValues.length > 0 ? Math.max(...nodeIncomingValues) : 1
                              
                              // Get unique categorical values for color assignment
                              const getCategoricalColor = (propName: string, propValue: any, colors: string[]) => {
                                const uniqueValues = Array.from(new Set(
                                  filteredData.nodes.map((n: any) => n[propName]).filter((v: any) => v != null)
                                ))
                                const colorMap = new Map()
                                uniqueValues.forEach((val, idx) => {
                                  colorMap.set(val, colors[idx % colors.length])
                                })
                                return colorMap.get(propValue) || colors[0]
                              }
                              
                              const categoricalColors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                              
                              return {
                                // Node ordering
                                nodeOrder: (d: any) => {
                                  if (nodeOrderMode === 'alphabetical') {
                                    return d.label || d.id
                                  }
                                  // Order by property value (categorical or numeric)
                                  const propValue = d[nodeOrderMode]
                                  if (propValue === undefined || propValue === null) {
                                    return `ZZZ_${d.label || d.id}` // Put undefined values at the end
                                  }
                                  if (typeof propValue === 'number') {
                                    return `${String(1e6 - propValue).padStart(10, '0')}_${d.label || d.id}` // Descending numeric
                                  }
                                  return `${String(propValue)}_${d.label || d.id}` // Ascending categorical
                                },
                                
                                // Node color
                                nodeColor: (d: any) => {
                                  if (nodeColorMode === 'single') {
                                    return '#2563eb'
                                  } else if (nodeColorMode === 'outgoing') {
                                    const normalized = maxOutgoing > 0 ? (d._totalOutgoing || 0) / maxOutgoing : 0
                                    const lightness = 20 + (normalized * 50) // 20% (dark) to 70% (light) for intensity
                                    return `hsl(200, 70%, ${lightness}%)`
                                  } else if (nodeColorMode === 'incoming') {
                                    const normalized = maxIncoming > 0 ? (d._totalIncoming || 0) / maxIncoming : 0
                                    const lightness = 20 + (normalized * 50)
                                    return `hsl(200, 70%, ${lightness}%)`
                                  } else if (nodeColorMode === 'attribute' && nodeColorAttribute) {
                                    const propValue = d[nodeColorAttribute]
                                    if (propValue === undefined || propValue === null) return '#999'
                                    
                                    // Check if it's a numeric property
                                    if (dataset?.metadata?.hasNumericProperties.nodes.includes(nodeColorAttribute)) {
                                      // Scale numeric value to color (using a color scale)
                                      const allValues = filteredData.nodes
                                        .map((n: any) => n[nodeColorAttribute])
                                        .filter((v: any) => typeof v === 'number') as number[]
                                      if (allValues.length === 0) return '#2563eb'
                                      
                                      const minVal = Math.min(...allValues)
                                      const maxVal = Math.max(...allValues)
                                      const range = maxVal - minVal || 1
                                      const normalized = (Number(propValue) - minVal) / range
                                      
                                      // Use hue from green (120) to red (0)
                                      const hue = 120 - (normalized * 120)
                                      return `hsl(${hue}, 70%, 50%)`
                                    } else {
                                      // Categorical - assign distinct colors
                                      return getCategoricalColor(nodeColorAttribute, propValue, categoricalColors)
                                    }
                                  }
                                  return '#2563eb'
                                },
                                
                                // Node size
                                nodeRadius: (d: any) => {
                                  if (nodeSizeMode === 'fixed') {
                                    return 6
                                  } else if (nodeSizeMode === 'outgoing') {
                                    const normalized = maxOutgoing > 0 ? (d._totalOutgoing || 0) / maxOutgoing : 0
                                    return 3 + (normalized * 9) // 3 to 12
                                  } else if (nodeSizeMode === 'incoming') {
                                    const normalized = maxIncoming > 0 ? (d._totalIncoming || 0) / maxIncoming : 0
                                    return 3 + (normalized * 9) // 3 to 12
                                  } else if (nodeSizeMode === 'attribute' && nodeSizeAttribute) {
                                    const propValue = d[nodeSizeAttribute]
                                    if (typeof propValue !== 'number') return 6
                                    
                                    const allValues = filteredData.nodes
                                      .map((n: any) => n[nodeSizeAttribute])
                                      .filter((v: any) => typeof v === 'number') as number[]
                                    if (allValues.length === 0) return 6
                                    
                                    const minVal = Math.min(...allValues)
                                    const maxVal = Math.max(...allValues)
                                    const range = maxVal - minVal || 1
                                    const normalized = (propValue - minVal) / range
                                    return 3 + (normalized * 9) // 3 to 12
                                  }
                                  return 6
                                },
                                
                                // Edge width
                                edgeWidth: (e: any) => {
                                  if (edgeWeightEncoding === 'width') {
                                    const normalized = (e.value - minEdgeWeight) / edgeWeightRange
                                    return 0.5 + (normalized * 15) // 0.5 to 15.5
                                  }
                                  // For color or opacity encodings, keep width constant for visual consistency
                                  return baseEdgeWidth
                                },
                                
                                // Edge color
                                edgeColor: (e: any, isAbove: boolean) => {
                                  const normalized = (e.value - minEdgeWeight) / edgeWeightRange
                                  
                                  if (edgeWeightEncoding === 'color') {
                                    // Color intensity based on weight
                                    const hue = 200 // Light blue
                                    const saturation = 70
                                    const lightness = 75 - (normalized * 50) // 75% (light) to 25% (dark)
                                    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
                                  } else if (edgeWeightEncoding === 'opacity') {
                                    // Base color with opacity variation - opacity will be applied via stroke-opacity in SVG
                                    // Return RGBA with varying alpha based on weight
                                    const alpha = 0.3 + (normalized * 0.7) // 0.3 to 1.0
                                    const baseColor = isAbove ? [31, 119, 180] : [214, 39, 40] // rgb values
                                    return `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`
                                  } else {
                                    // Width encoding - use base colors
                                    return isAbove ? '#1f77b4' : '#d62728'
                                  }
                                },
                              }
                            })()}
                          />
                          </div>
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
                          <div className="h-full w-full flex flex-col min-h-0">
                            <TableView nodes={filteredData.nodes} edges={filteredData.edges} />
                          </div>
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
                          <div className="h-full min-h-0">
                            <SankeyView 
                              nodes={filteredData.nodes} 
                              edges={filteredData.edges} 
                              width={Math.max(800, windowSize.width - (leftSidebarCollapsed ? 64 : leftSidebarWidth) - (rightSidebarCollapsed ? 4 : rightSidebarWidth) - 40)}
                              height={Math.max(600, windowSize.height - 80)}
                            />
                          </div>
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
                          <ChordView 
                            nodes={filteredData.nodes} 
                            edges={filteredData.edges} 
                            width={Math.max(800, windowSize.width - (leftSidebarCollapsed ? 64 : leftSidebarWidth) - (rightSidebarCollapsed ? 4 : rightSidebarWidth) - 40)}
                            height={Math.max(600, windowSize.height - 80)}
                          />
                        </ErrorBoundary>
                      )}
                    </>
                  ) : currentSnapshot ? (
                    <div className="text-center text-gray-500 py-8">
                      No data meets the current threshold range ({minThreshold.toLocaleString()} - {maxThreshold.toLocaleString()}). Try adjusting the filters.
                    </div>
                  ) : (
                    <div className="text-gray-500 py-8 text-center">No snapshot to display</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No dataset selected</p>
                  <p className="text-sm">Select a dataset from the sidebar to begin exploring</p>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - Settings Panel */}
          {dataset && (
            <SettingsPanel
              isCollapsed={rightSidebarCollapsed}
              onToggle={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
              onResize={setRightSidebarWidth}
              title="Visualization Settings"
              bottomContent={
                <div className="p-3">
                  <label className="text-xs font-medium text-gray-600 block mb-2">Visualization Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setViewType('kriskogram')
                        updateSearchParams({ view: 'kriskogram' })
                      }}
                      className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                        viewType === 'kriskogram'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Kriskogram
                    </button>
                    <button
                      onClick={() => {
                        setViewType('table')
                        updateSearchParams({ view: 'table' })
                      }}
                      className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                        viewType === 'table'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => {
                        setViewType('sankey')
                        updateSearchParams({ view: 'sankey' })
                      }}
                      className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                        viewType === 'sankey'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Sankey
                    </button>
                    <button
                      onClick={() => {
                        setViewType('chord')
                        updateSearchParams({ view: 'chord' })
                      }}
                      className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                        viewType === 'chord'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Chord
                    </button>
                  </div>
                </div>
              }
            >
              <div className="space-y-4">
                {/* Dataset Info - At Top */}
                <CollapsibleSection
                  title={dataset.name}
                  defaultOpen={true}
                  subtitle={`${dataset.type.toUpperCase()} · ${dataset.timeRange.start}${dataset.timeRange.end !== dataset.timeRange.start ? `–${dataset.timeRange.end}` : ''}`}
                >
                  {dataset.notes && (
                    <div className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                      {dataset.notes}
                    </div>
                  )}
                  {!dataset.notes && (
                    <div className="text-xs text-gray-500 italic mt-2">No description available</div>
                  )}
                </CollapsibleSection>

                {/* Statistics - Shortened */}
                {stats && (
                  <div className="p-3 bg-gray-50 rounded grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-600">Nodes</div>
                      <div className="text-lg font-bold">{stats.visibleNodes}/{stats.totalNodes}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Edges</div>
                      <div className="text-lg font-bold">{stats.visibleEdges.toLocaleString()}/{stats.totalEdges.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* General Settings - Collapsible */}
                <CollapsibleSection title="General Settings" defaultOpen={true}>
                  <div className="space-y-4">
                    {/* Year Slider */}
                    {hasTime && currentYear !== undefined && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Year: {currentYear}</label>
                        <input
                          type="range"
                          min={dataset.timeRange.start}
                          max={dataset.timeRange.end}
                          value={currentYear}
                          onChange={(e) => handleYearChange(parseInt(e.target.value))}
                          className="w-full"
                        />
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
                          onChange={(e) => {
                            const newValue = e.target.value === 'all' ? null : e.target.value
                            setEdgeTypeFilter(newValue)
                            updateSearchParams({ edgeType: newValue })
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Types</option>
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
                      <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <span>Min: {minThreshold.toLocaleString()}</span>
                          {effectiveMinEdgeValue !== undefined && effectiveMinEdgeValue > minThreshold && (
                            <span className="text-xs text-gray-400">(actual {effectiveMinEdgeValue.toLocaleString()})</span>
                          )}
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
                              className={`text-xs transition-colors ${isFiltered ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}
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
                          const newMin = Math.min(val, maxThreshold)
                          setMinThreshold(newMin)
                          updateSearchParams({ minThreshold: newMin })
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span>Max: {maxThreshold.toLocaleString()}</span>
                        {effectiveMaxEdgeValue !== undefined && effectiveMaxEdgeValue < maxThreshold && (
                          <span className="text-xs text-gray-400">(actual {effectiveMaxEdgeValue.toLocaleString()})</span>
                        )}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={stats.maxValue || 200000}
                        step={Math.max(1, Math.floor((stats.maxValue || 200000) / 1000))}
                        value={maxThreshold}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          const newMax = Math.max(val, minThreshold)
                          setMaxThreshold(newMax)
                          updateSearchParams({ maxThreshold: newMax })
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Max Edges: {maxEdges}
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={Math.max(500, stats.totalEdges)}
                        step={10}
                        value={maxEdges}
                        onChange={(e) => {
                          const newMaxEdges = parseInt(e.target.value)
                          setMaxEdges(newMaxEdges)
                          updateSearchParams({ maxEdges: newMaxEdges })
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600 italic">
                        After filtering by thresholds and edge type, edges are sorted by value (highest first) and the top {maxEdges} edges are displayed.
                      </p>
                    </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Kriskogram Visualization Controls */}
                {viewType === 'kriskogram' && (
                  <CollapsibleSection title="Kriskogram Settings" defaultOpen={true}>
                    {dataset?.metadata ? (
                      <div className="space-y-4">
                        {/* Node Ordering */}
                        <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Node Ordering</label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeOrder"
                            value="alphabetical"
                            checked={nodeOrderMode === 'alphabetical'}
                            onChange={(e) => setNodeOrderMode(e.target.value)}
                            className="w-3.5 h-3.5"
                          />
                          <span>Alphabetical</span>
                        </label>
                        {dataset.metadata.hasCategoricalProperties.nodes.map((prop) => (
                          <label key={prop} className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="nodeOrder"
                              value={prop}
                              checked={nodeOrderMode === prop}
                              onChange={(e) => setNodeOrderMode(e.target.value)}
                              className="w-3.5 h-3.5"
                            />
                            <span>By {prop}</span>
                          </label>
                        ))}
                        {dataset.metadata.hasNumericProperties.nodes.map((prop) => (
                          <label key={prop} className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="nodeOrder"
                              value={prop}
                              checked={nodeOrderMode === prop}
                              onChange={(e) => setNodeOrderMode(e.target.value)}
                              className="w-3.5 h-3.5"
                            />
                            <span>By {prop}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Arc Opacity */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">
                        Arc Opacity: {Math.round(arcOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={arcOpacity}
                        onChange={(e) => setArcOpacity(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Edge Weight Encoding */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Edge Weight</label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="edgeWeight"
                            value="width"
                            checked={edgeWeightEncoding === 'width'}
                            onChange={(e) => setEdgeWeightEncoding(e.target.value as 'width')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Width</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="edgeWeight"
                            value="color"
                            checked={edgeWeightEncoding === 'color'}
                            onChange={(e) => setEdgeWeightEncoding(e.target.value as 'color')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Color Intensity</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="edgeWeight"
                            value="opacity"
                            checked={edgeWeightEncoding === 'opacity'}
                            onChange={(e) => setEdgeWeightEncoding(e.target.value as 'opacity')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Opacity</span>
                        </label>
                      </div>
                      {edgeWeightEncoding !== 'width' && (
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-700">Base Edge Width: {baseEdgeWidth.toFixed(1)}px</label>
                          <input
                            type="range"
                            min={0.5}
                            max={8}
                            step={0.1}
                            value={baseEdgeWidth}
                            onChange={(e) => setBaseEdgeWidth(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* Node Color */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Node Color</label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeColor"
                            value="single"
                            checked={nodeColorMode === 'single'}
                            onChange={(e) => setNodeColorMode(e.target.value as 'single')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Single</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeColor"
                            value="outgoing"
                            checked={nodeColorMode === 'outgoing'}
                            onChange={(e) => setNodeColorMode(e.target.value as 'outgoing')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Total Outgoing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeColor"
                            value="incoming"
                            checked={nodeColorMode === 'incoming'}
                            onChange={(e) => setNodeColorMode(e.target.value as 'incoming')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Total Incoming</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeColor"
                            value="attribute"
                            checked={nodeColorMode === 'attribute'}
                            onChange={(e) => setNodeColorMode(e.target.value as 'attribute')}
                            className="w-3.5 h-3.5"
                          />
                          <span>By Attribute</span>
                        </label>
                      </div>
                      {nodeColorMode === 'attribute' && (
                        <select
                          value={nodeColorAttribute || ''}
                          onChange={(e) => setNodeColorAttribute(e.target.value || null)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {dataset.metadata.hasCategoricalProperties.nodes.map((prop) => (
                            <option key={prop} value={prop}>
                              {prop}
                            </option>
                          ))}
                          {dataset.metadata.hasNumericProperties.nodes.map((prop) => (
                            <option key={prop} value={prop}>
                              {prop}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Node Size */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Node Size</label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeSize"
                            value="fixed"
                            checked={nodeSizeMode === 'fixed'}
                            onChange={(e) => setNodeSizeMode(e.target.value as 'fixed')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Fixed</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeSize"
                            value="outgoing"
                            checked={nodeSizeMode === 'outgoing'}
                            onChange={(e) => setNodeSizeMode(e.target.value as 'outgoing')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Total Outgoing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeSize"
                            value="incoming"
                            checked={nodeSizeMode === 'incoming'}
                            onChange={(e) => setNodeSizeMode(e.target.value as 'incoming')}
                            className="w-3.5 h-3.5"
                          />
                          <span>Total Incoming</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="nodeSize"
                            value="attribute"
                            checked={nodeSizeMode === 'attribute'}
                            onChange={(e) => setNodeSizeMode(e.target.value as 'attribute')}
                            className="w-3.5 h-3.5"
                          />
                          <span>By Attribute</span>
                        </label>
                      </div>
                      {nodeSizeMode === 'attribute' && (
                        <select
                          value={nodeSizeAttribute || ''}
                          onChange={(e) => setNodeSizeAttribute(e.target.value || null)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {dataset.metadata.hasNumericProperties.nodes.map((prop) => (
                            <option key={prop} value={prop}>
                              {prop}
                            </option>
                          ))}
                        </select>
                        )}
                      </div>
                    </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">No dataset metadata available</div>
                    )}
                  </CollapsibleSection>
                )}

                {/* Table Visualization Controls */}
                {viewType === 'table' && (
                  <CollapsibleSection title="Table Settings" defaultOpen={false}>
                    <div className="text-xs text-gray-500 italic">Settings to be added</div>
                  </CollapsibleSection>
                )}

                {/* Sankey Visualization Controls */}
                {viewType === 'sankey' && (
                  <CollapsibleSection title="Sankey Settings" defaultOpen={false}>
                    <div className="text-xs text-gray-500 italic">Settings to be added</div>
                  </CollapsibleSection>
                )}

                {/* Chord Visualization Controls */}
                {viewType === 'chord' && (
                  <CollapsibleSection title="Chord Settings" defaultOpen={false}>
                    <div className="text-xs text-gray-500 italic">Settings to be added</div>
                  </CollapsibleSection>
                )}
              </div>
            </SettingsPanel>
          )}
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
      notes: 'Real U.S. Census Bureau data showing migration flows between all 50 states from the American Community Survey 1-Year Estimates.',
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
      notes: 'AI-generated sample network dataset in GEXF format demonstrating temporal migration patterns with multiple time slices. This example dataset includes economic, geographic, and migration type attributes for demonstration purposes.',
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
      notes: 'Relocations between Swiss cantons in 2016. This dataset contains 521,510 trips and uses a two-file CSV format with separate files for locations (cantons) and flows (relocations). Created by Ilya Boyandin.',
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

