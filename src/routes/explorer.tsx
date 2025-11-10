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
import { ensurePersistentStorage, getDataset, saveDataset, detectDatasetProperties, deleteDataset, type StoredDataset } from '../lib/storage'
import { loadCSVFromUrl, parseStateMigrationCSV } from '../lib/csv-parser'
import { parseTwoFileCSV } from '../lib/csv-two-file-parser'
import { gexfToKriskogramSnapshots, loadGexfFromUrl, type KriskogramSnapshot } from '../lib/gexf-parser'
import { filterEdgesByProperty, getUniqueEdgePropertyValues } from '../lib/data-adapters'
import { STATE_MIGRATION_CSV_FILES, STATE_MIGRATION_MISSING_YEARS } from '../data/stateMigrationFiles'
import { EXPECTED_STATE_COUNT, STATE_LABEL_SET } from '../data/stateLabels'
const YEAR_PLACEHOLDER_MESSAGES: Record<number, string> = STATE_MIGRATION_MISSING_YEARS.reduce(
  (acc, year) => {
    acc[year] =
      year === 2020
        ? 'ACS 1-year state-to-state migration flows for 2020 were not released by the Census Bureau due to pandemic-related data quality concerns.'
        : 'State-to-state migration data is unavailable for this year in the ACS 1-year series.';
    return acc;
  },
  {} as Record<number, string>,
);

type ViewType = 'kriskogram' | 'table' | 'sankey' | 'chord'

// Collapsible Section Component
function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  onReset,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode | string | number | undefined
  defaultOpen?: boolean
  onReset?: () => void
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border border-gray-200 rounded-md">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
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
        {onReset && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onReset()
            }}
            className="pr-3 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
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

const safeCoerceBoolean = (defaultValue: boolean) =>
  z.preprocess(
    (val) => {
      if (typeof val === 'boolean') return val
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true
        if (val.toLowerCase() === 'false') return false
      }
      return defaultValue
    },
    z.boolean().default(defaultValue),
  )

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
  edgeWeightScale: z.preprocess(
    (val) => {
      if (typeof val !== 'string') return 'linear'
      const lowered = val.toLowerCase()
      if (['linear', 'sqrt', 'log'].includes(lowered)) return lowered
      return 'linear'
    },
    z.enum(['linear', 'sqrt', 'log']).default('linear'),
  ),
  egoNodeId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || val === 'null') return null
      return typeof val === 'string' ? val : undefined
    },
    z.string().nullable().optional(),
  ),
  egoNeighborSteps: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return 1
      const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
      if (Number.isNaN(num) || num < 1) return 1
      return Math.max(1, Math.round(num))
    },
    z.number().min(1).default(1),
  ),
  egoStepColoring: safeCoerceBoolean(false),
  edgeType: z.preprocess(
    (val) => {
      if (val === 'null' || val === '') return null
      return typeof val === 'string' ? val : undefined
    },
    z.string().nullable().optional()
  ),
  showAllNodes: safeCoerceBoolean(false),
  temporalOverlay: safeCoerceBoolean(false),
  temporalOverlayEdgeStyle: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const lowered = val.toLowerCase()
        if (['segmented', 'filled', 'outline'].includes(lowered)) {
          return lowered
        }
      }
      return 'filled'
    },
    z.enum(['segmented', 'filled', 'outline']).default('filled'),
  ),
  temporalOverlayNodeStyle: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const lowered = val.toLowerCase()
        if (['filled', 'outline'].includes(lowered)) {
          return lowered
        }
      }
      return 'filled'
    },
    z.enum(['filled', 'outline']).default('filled'),
  ),
  temporalOverlayYears: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return 1
      const num = typeof val === 'string' ? parseInt(val, 10) : Number(val)
      if (Number.isNaN(num) || num < 1) return 1
      return Math.max(1, Math.round(num))
    },
    z.number().min(1).default(1),
  ),
  edgeSegmentLength: safeCoerceNumber(8),
  edgeSegmentGap: safeCoerceNumber(4),
  edgeSegmentAnimate: safeCoerceBoolean(false),
  edgeSegmentOffset: safeCoerceNumber(0),
  edgeSegmentCap: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const lowered = val.toLowerCase()
        if (['round', 'butt'].includes(lowered)) {
          return lowered as 'round' | 'butt'
        }
      }
      return 'round' as const
    },
    z.enum(['round', 'butt']).default('round'),
  ),
  edgeOutlineGap: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return 3
      const num = typeof val === 'string' ? parseFloat(val) : Number(val)
      return Number.isNaN(num) ? 3 : Math.max(0, num)
    },
    z.number().min(0).default(3),
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
    
    const safeEgoNodeId = (() => {
      if (search.egoNodeId === undefined || search.egoNodeId === null || search.egoNodeId === '' || search.egoNodeId === 'null') {
        return null
      }
      return typeof search.egoNodeId === 'string' ? search.egoNodeId : null
    })()

    const safeEgoNeighborSteps = (() => {
      if (search.egoNeighborSteps === undefined || search.egoNeighborSteps === null || search.egoNeighborSteps === '') {
        return 1
      }
      const num = typeof search.egoNeighborSteps === 'string'
        ? parseInt(search.egoNeighborSteps, 10)
        : Number(search.egoNeighborSteps)
      if (Number.isNaN(num) || num < 1) return 1
      return Math.max(1, Math.round(num))
    })()

    const safeEgoStepColoring = (() => {
      if (typeof search.egoStepColoring === 'boolean') {
        return search.egoStepColoring
      }
      if (typeof search.egoStepColoring === 'string') {
        const lowered = search.egoStepColoring.toLowerCase()
        if (lowered === 'true') return true
        if (lowered === 'false') return false
      }
      return false
    })()

    const safeEdgeWeightScale = (() => {
      if (typeof search.edgeWeightScale === 'string') {
        const lowered = search.edgeWeightScale.toLowerCase()
        if (['linear', 'sqrt', 'log'].includes(lowered)) {
          return lowered as 'linear' | 'sqrt' | 'log'
        }
      }
      return 'linear' as const
    })()

    const safeShowAllNodes = (() => {
      if (typeof search.showAllNodes === 'boolean') return search.showAllNodes
      if (typeof search.showAllNodes === 'string') {
        const lowered = search.showAllNodes.toLowerCase()
        if (lowered === 'true') return true
        if (lowered === 'false') return false
      }
      return false
    })()

    const safeTemporalOverlay = (() => {
      if (typeof search.temporalOverlay === 'boolean') return search.temporalOverlay
      if (typeof search.temporalOverlay === 'string') {
        const lowered = search.temporalOverlay.toLowerCase()
        if (lowered === 'true') return true
        if (lowered === 'false') return false
      }
      return false
    })()

    const safeTemporalOverlayEdgeStyle = (() => {
      if (typeof search.temporalOverlayEdgeStyle === 'string') {
        const lowered = search.temporalOverlayEdgeStyle.toLowerCase()
        if (['segmented', 'filled', 'outline'].includes(lowered)) {
          return lowered as 'segmented' | 'filled' | 'outline'
        }
      }
      return 'filled' as const
    })()

    const safeTemporalOverlayNodeStyle = (() => {
      if (typeof search.temporalOverlayNodeStyle === 'string') {
        const lowered = search.temporalOverlayNodeStyle.toLowerCase()
        if (['filled', 'outline'].includes(lowered)) {
          return lowered as 'filled' | 'outline'
        }
      }
      return 'filled' as const
    })()

    const safeTemporalOverlayYears = (() => {
      if (search.temporalOverlayYears === undefined || search.temporalOverlayYears === null || search.temporalOverlayYears === '') {
        return 1
      }
      const num = typeof search.temporalOverlayYears === 'string'
        ? parseInt(search.temporalOverlayYears, 10) : Number(search.temporalOverlayYears)
      if (Number.isNaN(num) || num < 1) return 1
      return Math.max(1, Math.round(num))
    })()

    const safeEdgeSegmentLength = (() => {
      if (search.edgeSegmentLength === undefined || search.edgeSegmentLength === null || search.edgeSegmentLength === '') return 8
      const num = typeof search.edgeSegmentLength === 'string' ? parseFloat(search.edgeSegmentLength) : Number(search.edgeSegmentLength)
      return Number.isNaN(num) ? 8 : Math.max(1, num)
    })()

    const safeEdgeSegmentGap = (() => {
      if (search.edgeSegmentGap === undefined || search.edgeSegmentGap === null || search.edgeSegmentGap === '') return 4
      const num = typeof search.edgeSegmentGap === 'string' ? parseFloat(search.edgeSegmentGap) : Number(search.edgeSegmentGap)
      return Number.isNaN(num) ? 4 : Math.max(0.5, num)
    })()

    const safeEdgeSegmentAnimate = (() => {
      if (typeof search.edgeSegmentAnimate === 'boolean') return search.edgeSegmentAnimate
      if (typeof search.edgeSegmentAnimate === 'string') {
        const lowered = search.edgeSegmentAnimate.toLowerCase()
        if (lowered === 'true') return true
        if (lowered === 'false') return false
      }
      return false
    })()

    const safeEdgeSegmentOffset = (() => {
      if (search.edgeSegmentOffset === undefined || search.edgeSegmentOffset === null || search.edgeSegmentOffset === '') return 0
      const num = typeof search.edgeSegmentOffset === 'string' ? parseFloat(search.edgeSegmentOffset) : Number(search.edgeSegmentOffset)
      return Number.isNaN(num) ? 0 : Math.max(0, num)
    })()

    const safeEdgeSegmentCap = (() => {
      if (typeof search.edgeSegmentCap === 'string') {
        const lowered = search.edgeSegmentCap.toLowerCase()
        if (['round', 'butt'].includes(lowered)) {
          return lowered as 'round' | 'butt'
        }
      }
      return 'round' as const
    })()

    const safeEdgeOutlineGap = (() => {
      if (search.edgeOutlineGap === undefined || search.edgeOutlineGap === null || search.edgeOutlineGap === '') return 3
      const num = typeof search.edgeOutlineGap === 'string' ? parseFloat(search.edgeOutlineGap) : Number(search.edgeOutlineGap)
      return Number.isNaN(num) ? 3 : Math.max(0, num)
    })()

    return {
      dataset: typeof search.dataset === 'string' ? search.dataset : undefined,
      view: safeView,
      year: safeYear,
      minThreshold: safeMinThreshold,
      maxThreshold: safeMaxThreshold,
      maxEdges: safeMaxEdges,
      edgeType: safeEdgeType,
      showAllNodes: safeShowAllNodes,
      egoNodeId: safeEgoNodeId,
      egoNeighborSteps: safeEgoNeighborSteps,
      egoStepColoring: safeEgoStepColoring && safeEgoNodeId ? safeEgoStepColoring : false,
      temporalOverlay: safeTemporalOverlay,
      temporalOverlayEdgeStyle: safeTemporalOverlayEdgeStyle,
      temporalOverlayNodeStyle: safeTemporalOverlayNodeStyle,
      temporalOverlayYears: safeTemporalOverlayYears,
      edgeWeightScale: safeEdgeWeightScale,
      edgeSegmentLength: safeEdgeSegmentLength,
      edgeSegmentGap: safeEdgeSegmentGap,
      edgeSegmentAnimate: safeEdgeSegmentAnimate,
      edgeSegmentOffset: safeEdgeSegmentOffset,
      edgeSegmentCap: safeEdgeSegmentCap,
      edgeOutlineGap: safeEdgeOutlineGap,
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
  const [showAllNodes, setShowAllNodes] = useState<boolean>(search.showAllNodes ?? false)
  const [egoNodeId, setEgoNodeId] = useState<string | null>(search.egoNodeId ?? null)
  const [egoNeighborSteps, setEgoNeighborSteps] = useState<number>(search.egoNeighborSteps ?? 1)
  const [egoStepColoring, setEgoStepColoring] = useState<boolean>(search.egoStepColoring ?? false)
  const [edgeWeightScale, setEdgeWeightScale] = useState<'linear' | 'sqrt' | 'log'>(
    search.edgeWeightScale ?? 'linear',
  )
  const [temporalOverlayEnabled, setTemporalOverlayEnabled] = useState<boolean>(search.temporalOverlay ?? false)
const [temporalOverlayEdgeStyle, setTemporalOverlayEdgeStyle] = useState<'segmented' | 'filled' | 'outline'>(
  search.temporalOverlayEdgeStyle ?? 'filled',
)
const [temporalOverlayNodeStyle, setTemporalOverlayNodeStyle] = useState<'filled' | 'outline'>(
  search.temporalOverlayNodeStyle ?? 'filled',
)
const [edgeSegmentLength, setEdgeSegmentLength] = useState<number>(search.edgeSegmentLength ?? 8)
const [edgeSegmentGap, setEdgeSegmentGap] = useState<number>(search.edgeSegmentGap ?? 4)
const [edgeSegmentAnimate, setEdgeSegmentAnimate] = useState<boolean>(search.edgeSegmentAnimate ?? false)
const [edgeSegmentOffset, setEdgeSegmentOffset] = useState<number>(search.edgeSegmentOffset ?? 0)
const [edgeSegmentCap, setEdgeSegmentCap] = useState<'round' | 'butt'>(search.edgeSegmentCap ?? 'round')
const [edgeOutlineGap, setEdgeOutlineGap] = useState<number>(search.edgeOutlineGap ?? 3)
  const [temporalOverlayYears, setTemporalOverlayYears] = useState<number>(search.temporalOverlayYears ?? 1)
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
  // Edge styling controls (inverted: independent width and color selectors)
  const [edgeWidthMode, setEdgeWidthMode] = useState<'fixed' | 'weight'>('weight')
  // Edge color (advanced: separate hue and intensity sources)
  const [edgeColorAdvanced, setEdgeColorAdvanced] = useState<boolean>(false)
  const [edgeColorHue, setEdgeColorHue] = useState<'direction' | 'region' | 'division' | 'attribute' | 'single'>('direction')
  const [edgeColorHueAttribute, setEdgeColorHueAttribute] = useState<string | null>(null)
  const [edgeColorIntensity, setEdgeColorIntensity] = useState<'constant' | 'weight' | 'attribute'>('weight')
  const [edgeColorIntensityAttribute, setEdgeColorIntensityAttribute] = useState<string | null>(null)
  const [edgeColorIntensityConst, setEdgeColorIntensityConst] = useState<number>(0.6)
  const [edgeColorInterGrayscale, setEdgeColorInterGrayscale] = useState<boolean>(true)
  // Intra/Inter filters
  const [intraFilter, setIntraFilter] = useState<'none' | 'region' | 'division' | 'interRegion' | 'interDivision'>('none')
  const [baseEdgeWidth, setBaseEdgeWidth] = useState<number>(2)
  const [nodeColorMode, setNodeColorMode] = useState<
    | 'single'
    | 'attribute'
    | 'visible_outgoing'
    | 'visible_incoming'
    | 'year_outgoing'
    | 'year_incoming'
    | 'net_year'
    | 'outgoing'
    | 'incoming'
    | 'self_year'
  >('single')
  const [nodeColorAttribute, setNodeColorAttribute] = useState<string | null>(null) // Property name when mode is 'attribute'
  const [nodeSizeMode, setNodeSizeMode] = useState<
    | 'fixed'
    | 'attribute'
    | 'visible_outgoing'
    | 'visible_incoming'
    | 'year_outgoing'
    | 'year_incoming'
    | 'net_visible'
    | 'net_year'
    | 'outgoing'
    | 'incoming'
    | 'self_year'
  >('fixed')
  const [nodeSizeAttribute, setNodeSizeAttribute] = useState<string | null>(null) // Property name when mode is 'attribute'
  const [interactionMode, setInteractionMode] = useState<'pan' | 'lens'>('pan')
  const [lensRadius, setLensRadius] = useState(80)
  const [lensPos, setLensPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  
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
  
  const maxTemporalNeighbor = useMemo(() => {
    if (!dataset) return 0
    const start = dataset.timeRange?.start
    const end = dataset.timeRange?.end
    if (typeof start !== 'number' || typeof end !== 'number') return 0
    return Math.max(0, end - start)
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

  const snapshotByYear = useMemo(() => {
    if (!dataset) return new Map<number, KriskogramSnapshot>()
    const map = new Map<number, KriskogramSnapshot>()
    dataset.snapshots.forEach((snapshot: any) => {
      const ts = typeof snapshot.timestamp === 'string' ? parseInt(snapshot.timestamp, 10) : snapshot.timestamp
      if (Number.isFinite(ts)) {
        map.set(ts, snapshot)
      }
    })
    return map
  }, [dataset])

  const datasetEdgeStats = useMemo(() => {
    if (!dataset) return null

    let min = Infinity
    let max = -Infinity
    let maxEdgesCount = 0

    dataset.snapshots.forEach((snapshot: any) => {
      const edges = Array.isArray(snapshot?.edges) ? (snapshot.edges as any[]) : []
      let nonSelfCount = 0
      edges.forEach((edge: any) => {
        if (edge?.source && edge.source === edge.target) {
          return
        }
        const value = Number(edge?.value)
        if (!Number.isFinite(value)) return
        nonSelfCount += 1
        if (value < min) min = value
        if (value > max) max = value
      })
      if (nonSelfCount > maxEdgesCount) {
        maxEdgesCount = nonSelfCount
      }
    })

    if (min === Infinity || max === -Infinity) {
      return {
        min: 0,
        max: 0,
        maxEdgesCount,
      }
    }

    return {
      min,
      max,
      maxEdgesCount,
    }
  }, [dataset])

  const datasetNodeNetStats = useMemo(() => {
    if (!dataset) return null

    let minNet = Infinity
    let maxNet = -Infinity

    dataset.snapshots.forEach((snapshot: any) => {
      const incoming = new Map<string, number>()
      const outgoing = new Map<string, number>()

      const edges = Array.isArray(snapshot?.edges) ? (snapshot.edges as any[]) : []
      edges.forEach((edge: any) => {
        const out = outgoing.get(edge.source) || 0
        outgoing.set(edge.source, out + edge.value)

        const inn = incoming.get(edge.target) || 0
        incoming.set(edge.target, inn + edge.value)
      })

      const nodes = Array.isArray(snapshot?.nodes) ? (snapshot.nodes as any[]) : []
      nodes.forEach((node: any) => {
        const net = (incoming.get(node.id) || 0) - (outgoing.get(node.id) || 0)
        if (net < minNet) minNet = net
        if (net > maxNet) maxNet = net
      })
    })

    if (minNet === Infinity || maxNet === -Infinity) {
      return { min: 0, max: 0 }
    }

    return { min: minNet, max: maxNet }
  }, [dataset])

  const datasetNodeYearFlowStats = useMemo(() => {
    if (!dataset) return null

    let maxIncoming = 0
    let maxOutgoing = 0

    dataset.snapshots.forEach((snapshot: any) => {
      const incoming = new Map<string, number>()
      const outgoing = new Map<string, number>()

      const edges = Array.isArray(snapshot?.edges) ? (snapshot.edges as any[]) : []
      edges.forEach((edge: any) => {
        const out = outgoing.get(edge.source) || 0
        outgoing.set(edge.source, out + edge.value)

        const inn = incoming.get(edge.target) || 0
        incoming.set(edge.target, inn + edge.value)
      })

      const nodes = Array.isArray(snapshot?.nodes) ? (snapshot.nodes as any[]) : []
      nodes.forEach((node: any) => {
        const totalIn = incoming.get(node.id) || 0
        const totalOut = outgoing.get(node.id) || 0
        if (totalIn > maxIncoming) maxIncoming = totalIn
        if (totalOut > maxOutgoing) maxOutgoing = totalOut
      })
    })

    return {
      maxIncoming,
      maxOutgoing,
    }
  }, [dataset])

  const datasetNodeSelfFlowStats = useMemo(() => {
    if (!dataset) return null

    let maxSelf = 0

    dataset.snapshots.forEach((snapshot: any) => {
      const edges = Array.isArray(snapshot?.edges) ? (snapshot.edges as any[]) : []
      const totals = new Map<string, number>()
      edges.forEach((edge: any) => {
        if (edge?.source && edge.source === edge.target) {
          const val = Number(edge.value)
          if (!Number.isFinite(val) || val <= 0) return
          const current = totals.get(edge.source) || 0
          totals.set(edge.source, current + val)
        }
      })
      totals.forEach((total) => {
        if (total > maxSelf) maxSelf = total
      })
    })

    return { max: maxSelf }
  }, [dataset])

  // Auto-adjust thresholds to stay within dataset-wide bounds
  useEffect(() => {
    if (!datasetEdgeStats) return
    const { min, max, maxEdgesCount } = datasetEdgeStats

    if (!Number.isFinite(min) || !Number.isFinite(max)) return

    const clamp = (value: number, lower: number, upper: number) => {
      if (upper < lower) return lower
      if (!Number.isFinite(value)) return lower
      if (value < lower) return lower
      if (value > upper) return upper
      return value
    }

    const nextMin = clamp(minThreshold, min, max)
    let nextMax = clamp(maxThreshold, min, max)
    if (nextMax < nextMin) {
      nextMax = nextMin
    }

    const edgesUpperBound = Math.max(1, maxEdgesCount)
    const nextMaxEdges = Math.max(1, Math.min(maxEdges, edgesUpperBound))

    if (nextMin !== minThreshold) {
      setMinThreshold(nextMin)
    }
    if (nextMax !== maxThreshold) {
      setMaxThreshold(nextMax)
    }
    if (nextMaxEdges !== maxEdges) {
      setMaxEdges(nextMaxEdges)
    }
  }, [datasetEdgeStats, minThreshold, maxThreshold, maxEdges])

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

  // Reset ego focus if the selected node is not present in the current snapshot
  useEffect(() => {
    if (!currentSnapshot) return
    if (egoNodeId) {
      const exists = (currentSnapshot.nodes as any[]).some((n: any) => n.id === egoNodeId)
      if (!exists) {
        setEgoNodeId(null)
        if (egoStepColoring) {
          setEgoStepColoring(false)
        }
        updateSearchParams({ egoNodeId: null, egoStepColoring: false })
      }
    }
  }, [currentSnapshot, egoNodeId, egoStepColoring, updateSearchParams])

  // Calculate filtered edges and nodes
  const filteredData = useMemo(() => {
    if (!dataset || !currentSnapshot) {
      return {
        nodes: [],
        edges: [],
        baseEdges: [],
        overlayEdges: [],
        egoStepMax: 0,
        overlayMeta: { hasPast: false, hasFuture: false, maxDelta: 0 },
      }
    }

    const currentYearValue = typeof currentYear === 'number' ? currentYear : null

    const totalIncomingAll = new Map<string, number>()
    const totalOutgoingAll = new Map<string, number>()
    const totalSelfFlowAll = new Map<string, number>()
    ;(currentSnapshot.edges as any[]).forEach((edge: any) => {
      const outgoing = totalOutgoingAll.get(edge.source) || 0
      totalOutgoingAll.set(edge.source, outgoing + edge.value)

      const incoming = totalIncomingAll.get(edge.target) || 0
      totalIncomingAll.set(edge.target, incoming + edge.value)

      if (edge.source === edge.target) {
        const currentSelf = totalSelfFlowAll.get(edge.source) || 0
        totalSelfFlowAll.set(edge.source, currentSelf + edge.value)
      }
    })

    const applyIntraFilter = (edgesList: any[], nodesList: any[]) => {
      if (intraFilter === 'none') return edgesList
      const idToNode = new Map<string, any>(nodesList.map((n: any) => [n.id, n]))
      return edgesList.filter((edge: any) => {
        const s = idToNode.get(edge.source)
        const t = idToNode.get(edge.target)
        if (!s || !t) return false
        if (intraFilter === 'region') return s.region && t.region && s.region === t.region
        if (intraFilter === 'division') return s.division && t.division && s.division === t.division
        if (intraFilter === 'interRegion') return s.region && t.region && s.region !== t.region
        if (intraFilter === 'interDivision') return s.division && t.division && s.division !== t.division
        return true
      })
    }

    let edgesToFilter = filterEdgesByProperty(
      currentSnapshot.edges as any[],
      edgeTypeInfo?.property || '',
      edgeTypeFilter,
    )

    edgesToFilter = applyIntraFilter(edgesToFilter, currentSnapshot.nodes as any[])
    edgesToFilter = edgesToFilter.filter((edge: any) => edge?.source !== edge?.target)

    const filteredEdgesBase = edgesToFilter
      .filter((e: any) => e.value >= minThreshold && e.value <= maxThreshold)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, maxEdges)

    const filteredEdgeInfos = filteredEdgesBase.map((edge: any, idx: number) => ({ edge, idx }))
    let visibleEdgeInfos = filteredEdgeInfos
    const edgeStepMap = new Map<number, number>()
    let maxEgoStepUsed = 0

    if (viewType === 'kriskogram' && egoNodeId) {
      const normalizedSteps = Math.max(1, Math.round(egoNeighborSteps))
      const allowedEdgeIndexes = new Set<number>()
      let frontier = new Set<string>()
      const visitedNodes = new Set<string>()

      frontier.add(egoNodeId)
      visitedNodes.add(egoNodeId)

      for (let step = 1; step <= normalizedSteps && frontier.size > 0; step += 1) {
        const nextFrontier = new Set<string>()

        filteredEdgeInfos.forEach(({ edge, idx }) => {
          if (frontier.has(edge.source) || frontier.has(edge.target)) {
            allowedEdgeIndexes.add(idx)
            const existing = edgeStepMap.get(idx)
            if (existing === undefined || step < existing) {
              edgeStepMap.set(idx, step)
            }

            if (!visitedNodes.has(edge.source)) {
              visitedNodes.add(edge.source)
              nextFrontier.add(edge.source)
            }
            if (!visitedNodes.has(edge.target)) {
              visitedNodes.add(edge.target)
              nextFrontier.add(edge.target)
            }
          }
        })

        frontier = nextFrontier
      }

      visibleEdgeInfos = filteredEdgeInfos.filter(({ idx }) => allowedEdgeIndexes.has(idx))
      edgeStepMap.forEach((step) => {
        if (step > maxEgoStepUsed) {
          maxEgoStepUsed = step
        }
      })
    }

    const currentEdgeStyle = temporalOverlayEdgeStyle
    const currentDashArray =
      temporalOverlayEdgeStyle === 'segmented'
        ? `${Math.max(1, edgeSegmentLength)} ${Math.max(0.5, edgeSegmentGap)}`
        : null
    const currentDashOffset = temporalOverlayEdgeStyle === 'segmented' ? Math.max(0, edgeSegmentOffset) : 0
    const currentLineCap = temporalOverlayEdgeStyle === 'segmented' ? edgeSegmentCap : 'round'
    const visibleEdgesCurrent = visibleEdgeInfos.map(({ edge, idx }) => {
      const step = edgeStepMap.get(idx)
      const decorated: any = {
        ...edge,
        __isOverlay: false,
        __displayYear: currentYearValue,
        __temporalDelta: 0,
        _overlayType: undefined,
        _overlayYear: currentYearValue,
        __overlayStyle: currentEdgeStyle,
        __overlayDash: currentDashArray,
        __overlayDashOffset: currentDashOffset,
        __overlayLineCap: currentLineCap,
        __segmentCycle:
          temporalOverlayEdgeStyle === 'segmented' ? Math.max(1, edgeSegmentLength + edgeSegmentGap) : 0,
        __segmentAnimate: temporalOverlayEdgeStyle === 'segmented' && edgeSegmentAnimate,
        __outlineGap: edgeOutlineGap,
      }
      if (step !== undefined) {
        decorated._egoStep = step
      }
      return decorated
    })

    const activeNodeIds = new Set<string>()
    visibleEdgesCurrent.forEach((e: any) => {
      activeNodeIds.add(e.source)
      activeNodeIds.add(e.target)
    })

    if (egoNodeId) {
      activeNodeIds.add(egoNodeId)
    }

    const nodeIncoming = new Map<string, number>()
    const nodeOutgoing = new Map<string, number>()

    visibleEdgesCurrent.forEach((e: any) => {
      const outgoing = nodeOutgoing.get(e.source) || 0
      nodeOutgoing.set(e.source, outgoing + e.value)

      const incoming = nodeIncoming.get(e.target) || 0
      nodeIncoming.set(e.target, incoming + e.value)
    })

    const overlayEdges: any[] = []
    const overlayPastTotals = new Map<string, number>()
    const overlayFutureTotals = new Map<string, number>()
    let overlayNodeAbsMax = 0
    let overlayHasPast = false
    let overlayHasFuture = false

    const yearToSnapshot = new Map<number, any>()
    if (dataset) {
      dataset.snapshots.forEach((snap: any) => {
        const ts = typeof snap.timestamp === 'string' ? parseInt(snap.timestamp, 10) : snap.timestamp
        if (Number.isFinite(ts)) {
          yearToSnapshot.set(ts, snap)
        }
      })
    }

    if (temporalOverlayEnabled && dataset && typeof currentYear === 'number' && dataset.timeRange.start !== dataset.timeRange.end) {
      const windowSize = Math.max(1, Math.round(temporalOverlayYears))
      for (let offset = -windowSize; offset <= windowSize; offset += 1) {
        if (offset === 0) continue
        const targetYear = currentYear + offset
        const snapshot = yearToSnapshot.get(targetYear)
        if (!snapshot) continue

        const rawEdges = Array.isArray(snapshot.edges) ? (snapshot.edges as any[]) : []
        let edgesForSnapshot = filterEdgesByProperty(
          rawEdges,
          edgeTypeInfo?.property || '',
          edgeTypeFilter,
        )

        if (intraFilter !== 'none') {
          const idToNode = new Map<string, any>((snapshot.nodes as any[]).map((n: any) => [n.id, n]))
          if (intraFilter === 'region') {
            edgesForSnapshot = edgesForSnapshot.filter((e: any) => {
              const s = idToNode.get(e.source)
              const t = idToNode.get(e.target)
              return s && t && s.region && t.region && s.region === t.region
            })
          } else if (intraFilter === 'division') {
            edgesForSnapshot = edgesForSnapshot.filter((e: any) => {
              const s = idToNode.get(e.source)
              const t = idToNode.get(e.target)
              return s && t && s.division && t.division && s.division === t.division
            })
          } else if (intraFilter === 'interRegion') {
            edgesForSnapshot = edgesForSnapshot.filter((e: any) => {
              const s = idToNode.get(e.source)
              const t = idToNode.get(e.target)
              return s && t && s.region && t.region && s.region !== t.region
            })
          } else if (intraFilter === 'interDivision') {
            edgesForSnapshot = edgesForSnapshot.filter((e: any) => {
              const s = idToNode.get(e.source)
              const t = idToNode.get(e.target)
              return s && t && s.division && t.division && s.division !== t.division
            })
          }
        }

        const overlayDashArray =
          temporalOverlayEdgeStyle === 'segmented'
            ? `${Math.max(1, edgeSegmentLength)} ${Math.max(0.5, edgeSegmentGap)}`
            : null
        const overlayDashOffset = temporalOverlayEdgeStyle === 'segmented' ? Math.max(0, edgeSegmentOffset) : 0
        const overlayLineCap = temporalOverlayEdgeStyle === 'segmented' ? edgeSegmentCap : 'round'

        const overlaySubset = edgesForSnapshot
          .filter((e: any) => e.value >= minThreshold && e.value <= maxThreshold)
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, maxEdges)
          .map((edge: any) => ({
            ...edge,
            _overlayType: offset < 0 ? 'past' : 'future',
            _overlayYear: targetYear,
            __isOverlay: true,
            __displayYear: targetYear,
            __temporalDelta: offset,
            __overlayStyle: temporalOverlayEdgeStyle,
            __overlayDash: overlayDashArray,
            __overlayDashOffset: overlayDashOffset,
            __overlayLineCap: overlayLineCap,
            __segmentCycle:
              temporalOverlayEdgeStyle === 'segmented' ? Math.max(1, edgeSegmentLength + edgeSegmentGap) : 0,
            __segmentAnimate: temporalOverlayEdgeStyle === 'segmented' && edgeSegmentAnimate,
            __outlineGap: edgeOutlineGap,
          }))

        overlaySubset.forEach((edge: any) => {
          overlayEdges.push(edge)
          if (edge._overlayType === 'past') {
            overlayHasPast = true
            const out = overlayPastTotals.get(edge.source) || 0
            overlayPastTotals.set(edge.source, out + edge.value)
            const inn = overlayPastTotals.get(edge.target) || 0
            overlayPastTotals.set(edge.target, inn + edge.value)
          } else {
            overlayHasFuture = true
            const out = overlayFutureTotals.get(edge.source) || 0
            overlayFutureTotals.set(edge.source, out + edge.value)
            const inn = overlayFutureTotals.get(edge.target) || 0
            overlayFutureTotals.set(edge.target, inn + edge.value)
          }
        })
      }
    }

    if (overlayEdges.length > 0) {
      overlayEdges.forEach((edge: any) => {
        activeNodeIds.add(edge.source)
        activeNodeIds.add(edge.target)
      })
    }

    const keepAllNodes = viewType === 'kriskogram' && showAllNodes

    if (
      !keepAllNodes &&
      process.env.NODE_ENV !== 'production' &&
      maxEdges < (currentSnapshot.edges as any[]).length
    ) {
      const hiddenNodes = (currentSnapshot.nodes as any[])
        .filter((n: any) => !activeNodeIds.has(n.id))
        .map((n: any) => n.label || n.id)

      if (hiddenNodes.length > 0) {
        console.info(
          `[Explorer] ${hiddenNodes.length} nodes currently lack visible edges after filtering (maxEdges=${maxEdges}, thresholds=${minThreshold}-${maxThreshold}).`,
          hiddenNodes.slice(0, 10),
        )
      }
    }

    const baseNodes = keepAllNodes
      ? (currentSnapshot.nodes as any[])
      : (currentSnapshot.nodes as any[]).filter((n: any) => activeNodeIds.has(n.id))

    const nodesWithDynamicAttrs = baseNodes.map((n: any) => {
      const visibleIncoming = nodeIncoming.get(n.id) || 0
      const visibleOutgoing = nodeOutgoing.get(n.id) || 0
      const totalIncomingYear = totalIncomingAll.get(n.id) || 0
      const totalOutgoingYear = totalOutgoingAll.get(n.id) || 0
      const netVisible = visibleIncoming - visibleOutgoing
      const netYear = totalIncomingYear - totalOutgoingYear
      const selfFlowYear = totalSelfFlowAll.get(n.id) || 0
      const overlayPast = overlayPastTotals.get(n.id) || 0
      const overlayFuture = overlayFutureTotals.get(n.id) || 0
      const overlayDelta = overlayFuture - overlayPast
      if (Math.abs(overlayDelta) > overlayNodeAbsMax) {
        overlayNodeAbsMax = Math.abs(overlayDelta)
      }

      return {
        ...n,
        _totalIncoming: visibleIncoming,
        _totalOutgoing: visibleOutgoing,
        total_incoming_visible: visibleIncoming,
        total_outgoing_visible: visibleOutgoing,
        total_incoming_year: totalIncomingYear,
        total_outgoing_year: totalOutgoingYear,
        net_flow_visible: netVisible,
        net_flow_year: netYear,
        self_flow_year: selfFlowYear,
        temporal_overlay_past_total: overlayPast,
        temporal_overlay_future_total: overlayFuture,
        temporal_overlay_delta: overlayDelta,
        _overlayPastTotal: overlayPast,
        _overlayFutureTotal: overlayFuture,
        _overlayDelta: overlayDelta,
      }
    })

    if (temporalOverlayEnabled) {
      nodesWithDynamicAttrs.forEach((node: any) => {
        const delta = node._overlayDelta ?? 0
        if (overlayNodeAbsMax > 0 && delta !== 0) {
          const ratio = Math.max(0, Math.min(1, Math.abs(delta) / overlayNodeAbsMax))
          node._overlayStrokeWidth = 1.5 + ratio * 3
          node._overlayStrokeColor = delta > 0 ? 'hsl(0, 75%, 55%)' : 'hsl(210, 75%, 55%)'
        } else if (overlayNodeAbsMax > 0) {
          node._overlayStrokeWidth = 1.5
          node._overlayStrokeColor = '#cbd5f5'
        } else {
          node._overlayStrokeWidth = 2
          node._overlayStrokeColor = '#fff'
        }
      })
    } else {
      nodesWithDynamicAttrs.forEach((node: any) => {
        node._overlayStrokeWidth = 2
        node._overlayStrokeColor = '#fff'
      })
    }

    const temporalOverlaySummary = temporalOverlayEnabled
      ? {
          hasPast: overlayHasPast,
          hasFuture: overlayHasFuture,
          nodeDeltaAbsMax: overlayNodeAbsMax,
          style: temporalOverlayEdgeStyle,
          edgeSegmentLength,
          edgeSegmentGap,
          edgeSegmentOffset,
          edgeSegmentCap,
          edgeSegmentAnimate,
          edgeOutlineGap,
        }
      : null

    const combinedEdges = temporalOverlayEnabled && overlayEdges.length > 0
      ? [...visibleEdgesCurrent, ...overlayEdges]
      : visibleEdgesCurrent

    return {
      nodes: nodesWithDynamicAttrs,
      baseEdges: visibleEdgesCurrent,
      edges: combinedEdges,
      currentEdgeCount: visibleEdgesCurrent.length,
      egoStepMax: maxEgoStepUsed,
      temporalOverlay: temporalOverlaySummary,
    }
  }, [
    currentSnapshot,
    minThreshold,
    maxThreshold,
    maxEdges,
    edgeTypeFilter,
    edgeTypeInfo,
    intraFilter,
    showAllNodes,
    viewType,
    egoNodeId,
    egoNeighborSteps,
    edgeWeightScale,
    temporalOverlayEnabled,
    temporalOverlayEdgeStyle,
    temporalOverlayNodeStyle,
    temporalOverlayYears,
    edgeSegmentLength,
    edgeSegmentGap,
    edgeSegmentOffset,
    edgeSegmentCap,
    edgeSegmentAnimate,
    edgeOutlineGap,
    dataset,
  ])

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
      visibleEdges: filteredData.currentEdgeCount ?? filteredData.edges.filter((e: any) => !e._overlayType).length,
      avgValue,
      maxValue,
    }
  }, [currentSnapshot, filteredData])

  const datasetMinEdgeValue = datasetEdgeStats?.min ?? 0
  const datasetMaxEdgeValue = datasetEdgeStats?.max ?? (stats?.maxValue ?? datasetMinEdgeValue)
  const sliderMaxValue = Math.max(datasetMinEdgeValue, datasetMaxEdgeValue)
  const normalizedSliderMax = Math.max(sliderMaxValue, 1)
  const sliderStep = Math.max(1, Math.floor(normalizedSliderMax / 1000))
  const datasetMaxEdgesCount = datasetEdgeStats?.maxEdgesCount ?? (stats?.totalEdges ?? 0)
  const maxEdgesUpperBound = Math.max(500, datasetMaxEdgesCount)

  // Effective minimum value after applying thresholds and maxEdges (top-N)
  const effectiveMinEdgeValue = useMemo(() => {
    if (!filteredData || filteredData.currentEdgeCount === 0) return undefined as number | undefined
    const currentEdgesOnly = filteredData.edges.filter((e: any) => !e._overlayType)
    if (currentEdgesOnly.length === 0) return undefined as number | undefined
    return Math.min(...currentEdgesOnly.map((e: any) => e.value))
  }, [filteredData])

  // Metadata presence for conditional UI (region/division coloring)
  const hasRegionData = useMemo(() => {
    return filteredData.nodes.some((n: any) => n && n.region)
  }, [filteredData])
  const hasDivisionData = useMemo(() => {
    return filteredData.nodes.some((n: any) => n && n.division)
  }, [filteredData])

  useEffect(() => {
    if (!hasRegionData && edgeColorHue === 'region') {
      setEdgeColorHue('direction')
    }
    if (!hasDivisionData && edgeColorHue === 'division') {
      setEdgeColorHue('direction')
    }
  }, [hasRegionData, hasDivisionData, edgeColorHue])

  const effectiveMaxEdgeValue = useMemo(() => {
    if (!filteredData || filteredData.currentEdgeCount === 0) return undefined as number | undefined
    const currentEdgesOnly = filteredData.edges.filter((e: any) => !e._overlayType)
    if (currentEdgesOnly.length === 0) return undefined as number | undefined
    return Math.max(...currentEdgesOnly.map((e: any) => e.value))
  }, [filteredData])

  // Update visualization when filtered data changes (only for kriskogram view)
  useEffect(() => {
    if (viewType === 'kriskogram' && filteredData.nodes.length > 0 && krRef.current) {
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

  useEffect(() => {
    if (!isInitialMount.current) {
      // no-op
    }
  }, [])

  useEffect(() => {
    if (!currentSnapshot) return
    if (egoNodeId) {
      const exists = (currentSnapshot.nodes as any[]).some((n: any) => n.id === egoNodeId)
      if (!exists) {
        setEgoNodeId(null)
        if (egoStepColoring) {
          setEgoStepColoring(false)
        }
        updateSearchParams({ egoNodeId: null, egoStepColoring: false })
      }
    }
  }, [currentSnapshot, egoNodeId, egoStepColoring, updateSearchParams])

  useEffect(() => {
    if (!dataset || dataset.timeRange.start === dataset.timeRange.end || typeof currentYear !== 'number') {
      if (temporalOverlayEnabled) {
        setTemporalOverlayEnabled(false)
        updateSearchParams({
          temporalOverlay: false,
          temporalOverlayEdgeStyle,
          temporalOverlayNodeStyle,
          edgeSegmentLength,
          edgeSegmentGap,
          edgeSegmentOffset,
          edgeSegmentCap,
          edgeSegmentAnimate,
          edgeOutlineGap,
         })
       }
     }
   }, [
     dataset,
     currentYear,
     temporalOverlayEnabled,
     temporalOverlayEdgeStyle,
     temporalOverlayNodeStyle,
     edgeSegmentLength,
     edgeSegmentGap,
     edgeSegmentOffset,
     edgeSegmentCap,
     edgeSegmentAnimate,
     edgeOutlineGap,
     updateSearchParams,
   ])

  useEffect(() => {
    if (!isInitialMount.current) {
      updateSearchParams({
        temporalOverlay: temporalOverlayEnabled,
        temporalOverlayYears,
        temporalOverlayEdgeStyle,
        temporalOverlayNodeStyle,
        edgeSegmentLength,
        edgeSegmentGap,
        edgeSegmentOffset,
        edgeSegmentCap,
        edgeSegmentAnimate,
        edgeOutlineGap,
      })
    }
  }, [
    temporalOverlayEnabled,
    temporalOverlayYears,
    temporalOverlayEdgeStyle,
    temporalOverlayNodeStyle,
    edgeSegmentLength,
    edgeSegmentGap,
    edgeSegmentOffset,
    edgeSegmentCap,
    edgeSegmentAnimate,
    edgeOutlineGap,
    updateSearchParams,
  ])

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
        <main className="flex-1 flex flex-col overflow-hidden h-full relative">
          {loading && <div className="p-4 bg-yellow-50 text-yellow-800">Loading…</div>}
          {error && <div className="p-4 bg-red-50 text-red-600">{error}</div>}

            {dataset ? (
              <>
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className={`flex-1 overflow-hidden ${viewType === 'table' ? '' : 'p-4'}`}>
                {filteredData.nodes.length > 0 && filteredData.baseEdges.length > 0 ? (
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
                              const edgeWeights = filteredData.baseEdges.map((e: any) => e.value)
                              const minEdgeWeight = edgeWeights.length > 0 ? Math.min(...edgeWeights) : 0
                              const maxEdgeWeight = edgeWeights.length > 0 ? Math.max(...edgeWeights) : 1
                              const globalMinEdgeWeight = datasetEdgeStats?.min ?? minEdgeWeight
                              const globalMaxEdgeWeight = datasetEdgeStats?.max ?? maxEdgeWeight
                              const weightSpan = Math.max(globalMaxEdgeWeight - globalMinEdgeWeight, 0)

                              const egoStepMax = filteredData.egoStepMax ?? 0
                              const shouldColorEdgesByEgoStep = Boolean(egoNodeId && egoStepColoring && egoStepMax > 0)
                              const computeEgoStepColor = (step: number) => {
                                if (egoStepMax <= 1) {
                                  return 'hsl(210, 80%, 55%)'
                                }
                                const clamped = Math.max(1, Math.min(step, egoStepMax))
                                const ratio = egoStepMax <= 1 ? 0 : (clamped - 1) / (egoStepMax - 1)
                                const hue = 210 - ratio * 150
                                const lightness = 60 - ratio * 20
                                return `hsl(${Math.round(hue)}, 80%, ${Math.round(lightness)}%)`
                              }

                              const normalizeEdgeWeight = (value: number) => {
                                if (!Number.isFinite(value) || weightSpan <= 0) return 0
                                const clamped = Math.min(
                                  Math.max(value, globalMinEdgeWeight),
                                  globalMaxEdgeWeight,
                                )
                                const shifted = clamped - globalMinEdgeWeight
                                switch (edgeWeightScale) {
                                  case 'sqrt': {
                                    const denom = Math.sqrt(weightSpan)
                                    if (denom <= 0) return 0
                                    return Math.max(0, Math.min(1, Math.sqrt(shifted) / denom))
                                  }
                                  case 'log': {
                                    const denom = Math.log10(weightSpan + 1)
                                    if (!Number.isFinite(denom) || denom <= 0) return 0
                                    return Math.max(0, Math.min(1, Math.log10(shifted + 1) / denom))
                                  }
                                  case 'linear':
                                  default: {
                                    const denom = weightSpan
                                    if (denom <= 0) return 0
                                    return Math.max(0, Math.min(1, shifted / denom))
                                  }
                                }
                              }

                              const valueForFraction = (fraction: number) => {
                                if (weightSpan <= 0) return globalMinEdgeWeight
                                const clampedF = Math.max(0, Math.min(1, fraction))
                                switch (edgeWeightScale) {
                                  case 'sqrt': {
                                    return globalMinEdgeWeight + Math.pow(clampedF, 2) * weightSpan
                                  }
                                  case 'log': {
                                    const denom = Math.log10(weightSpan + 1)
                                    if (!Number.isFinite(denom) || denom <= 0) return globalMinEdgeWeight
                                    const increment = Math.pow(10, clampedF * denom) - 1
                                    return globalMinEdgeWeight + increment
                                  }
                                  case 'linear':
                                  default: {
                                    return globalMinEdgeWeight + clampedF * weightSpan
                                  }
                                }
                              }
                              
                              // Compute node attribute ranges for color/size scaling
                              const nodeVisibleOutgoingValues = filteredData.nodes.map((n: any) => n.total_outgoing_visible || n._totalOutgoing || 0)
                              const nodeVisibleIncomingValues = filteredData.nodes.map((n: any) => n.total_incoming_visible || n._totalIncoming || 0)
                              const nodeYearOutgoingValues = filteredData.nodes.map((n: any) => n.total_outgoing_year || 0)
                              const nodeYearIncomingValues = filteredData.nodes.map((n: any) => n.total_incoming_year || 0)
                              const nodeNetVisibleValues = filteredData.nodes.map((n: any) => n.net_flow_visible || 0)
                              const nodeNetYearValues = filteredData.nodes.map((n: any) => n.net_flow_year || 0)

                              const maxVisibleOutgoing = nodeVisibleOutgoingValues.length > 0 ? Math.max(...nodeVisibleOutgoingValues) : 1
                              const maxVisibleIncoming = nodeVisibleIncomingValues.length > 0 ? Math.max(...nodeVisibleIncomingValues) : 1
                              const maxYearOutgoingLocal = nodeYearOutgoingValues.length > 0 ? Math.max(...nodeYearOutgoingValues) : 1
                              const maxYearIncomingLocal = nodeYearIncomingValues.length > 0 ? Math.max(...nodeYearIncomingValues) : 1
                              const maxAbsNetVisible = nodeNetVisibleValues.length > 0 ? Math.max(...nodeNetVisibleValues.map((v: number) => Math.abs(v))) : 1
                              const maxAbsNetYearLocal = nodeNetYearValues.length > 0 ? Math.max(...nodeNetYearValues.map((v: number) => Math.abs(v))) : 1

                              const globalMaxYearOutgoing = datasetNodeYearFlowStats?.maxOutgoing ?? maxYearOutgoingLocal
                              const globalMaxYearIncoming = datasetNodeYearFlowStats?.maxIncoming ?? maxYearIncomingLocal
                              const globalNetMin = datasetNodeNetStats?.min ?? -maxAbsNetYearLocal
                              const globalNetMax = datasetNodeNetStats?.max ?? maxAbsNetYearLocal
                              const globalNetAbs = Math.max(Math.abs(globalNetMin), Math.abs(globalNetMax)) || 1
                              
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
                              
                              const overlaySummary = filteredData.temporalOverlay
                              const overlayActive = Boolean(overlaySummary)
                              const edgeStyleSetting = temporalOverlayEdgeStyle
                              const nodeStyleSetting = temporalOverlayNodeStyle
                              const nodeOutlineActive = nodeStyleSetting === 'outline'
                              const overlayDeltaMax = overlaySummary?.nodeDeltaAbsMax ?? 0
                              const overlayEdgeColor = (delta: number) => {
                                if (delta === 0) return '#6b7280'
                                const clamped = Math.max(-overlayDeltaMax, Math.min(overlayDeltaMax, delta))
                                const intensity = overlayDeltaMax > 0 ? Math.abs(clamped) / overlayDeltaMax : 0.5
                                const baseLightness = 65 - intensity * 20
                                if (delta < 0) {
                                  return `hsl(210, 75%, ${Math.round(baseLightness)}%)`
                                }
                                return `hsl(0, 75%, ${Math.round(baseLightness)}%)`
                              }
                              
                              const resolveBaseNodeColor = (node: any): string => {
                                const normalizedRatio = (value: number, max: number) => {
                                  if (!Number.isFinite(value) || max <= 0) return 0
                                  return Math.max(0, Math.min(1, value / max))
                                }

                                const gradientColor = (hue: number, saturation: number, ratio: number) => {
                                  const clamped = Math.max(0, Math.min(1, ratio))
                                  const lightness = 85 - clamped * 45
                                  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
                                }

                                const netColor = (netValue: number) => {
                                  if (!Number.isFinite(netValue) || globalNetAbs <= 0) {
                                    return '#6b7280'
                                  }
                                  if (Math.abs(netValue) < 1e-6) {
                                    return '#9ca3af'
                                  }
                                  const intensity = Math.max(0, Math.min(1, Math.abs(netValue) / globalNetAbs))
                                  const lightness = 85 - intensity * 45
                                  return netValue >= 0 ? `hsl(0, 75%, ${lightness}%)` : `hsl(210, 75%, ${lightness}%)`
                                }

                                switch (nodeColorMode) {
                                  case 'single':
                                    return '#2563eb'
                                  case 'outgoing':
                                  case 'visible_outgoing': {
                                    const ratio = normalizedRatio(node.total_outgoing_visible || node._totalOutgoing || 0, maxVisibleOutgoing)
                                    return gradientColor(24, 85, ratio)
                                  }
                                  case 'incoming':
                                  case 'visible_incoming': {
                                    const ratio = normalizedRatio(node.total_incoming_visible || node._totalIncoming || 0, maxVisibleIncoming)
                                    return gradientColor(160, 70, ratio)
                                  }
                                  case 'year_outgoing': {
                                    const ratio = normalizedRatio(node.total_outgoing_year || 0, globalMaxYearOutgoing)
                                    return gradientColor(24, 85, ratio)
                                  }
                                  case 'year_incoming': {
                                    const ratio = normalizedRatio(node.total_incoming_year || 0, globalMaxYearIncoming)
                                    return gradientColor(160, 70, ratio)
                                  }
                                  case 'net_year':
                                    return netColor(node.net_flow_year || 0)
                                  case 'self_year': {
                                    const ratio = normalizedRatio(node.self_flow_year || 0, datasetNodeSelfFlowStats?.max ?? 0)
                                    return gradientColor(280, 70, ratio)
                                  }
                                  case 'attribute': {
                                    if (!nodeColorAttribute) return '#2563eb'
                                    const propValue = node[nodeColorAttribute]
                                    if (propValue === undefined || propValue === null) return '#9ca3af'

                                    if (dataset?.metadata?.hasNumericProperties.nodes.includes(nodeColorAttribute)) {
                                      const allValues = filteredData.nodes
                                        .map((n: any) => n[nodeColorAttribute])
                                        .filter((v: any) => typeof v === 'number') as number[]
                                      if (allValues.length === 0) return '#2563eb'

                                      const minVal = Math.min(...allValues)
                                      const maxVal = Math.max(...allValues)
                                      const range = maxVal - minVal || 1
                                      const normalized = (Number(propValue) - minVal) / range
                                      const hue = 120 - Math.max(0, Math.min(1, normalized)) * 120
                                      return `hsl(${hue}, 70%, 50%)`
                                    }

                                    return getCategoricalColor(nodeColorAttribute, propValue, categoricalColors)
                                  }
                                  default:
                                    return '#2563eb'
                                }
                              }
                              
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
                                  const baseColor = resolveBaseNodeColor(d)
                                  d.__baseFillColor = baseColor
                                  return nodeOutlineActive ? 'transparent' : baseColor
                                },
                                
                                // Node size
                                nodeRadius: (d: any) => {
                                  const visibleOutgoing = d.total_outgoing_visible || d._totalOutgoing || 0
                                  const visibleIncoming = d.total_incoming_visible || d._totalIncoming || 0
                                  const yearOutgoing = d.total_outgoing_year || 0
                                  const yearIncoming = d.total_incoming_year || 0
                                  const netVisible = Math.abs(d.net_flow_visible || 0)
                                  const netYear = Math.abs(d.net_flow_year || 0)
                                  const selfYear = d.self_flow_year || 0

                                  const sizeFromRatio = (ratio: number) => 3 + (Math.max(0, Math.min(1, ratio)) * 9)

                                  if (nodeSizeMode === 'fixed') {
                                    return 6
                                  }

                                  if (nodeSizeMode === 'visible_outgoing' || nodeSizeMode === 'outgoing') {
                                    return sizeFromRatio(maxVisibleOutgoing > 0 ? visibleOutgoing / maxVisibleOutgoing : 0)
                                  }

                                  if (nodeSizeMode === 'visible_incoming' || nodeSizeMode === 'incoming') {
                                    return sizeFromRatio(maxVisibleIncoming > 0 ? visibleIncoming / maxVisibleIncoming : 0)
                                  }

                                  if (nodeSizeMode === 'year_outgoing') {
                                    return sizeFromRatio(globalMaxYearOutgoing > 0 ? yearOutgoing / globalMaxYearOutgoing : 0)
                                  }

                                  if (nodeSizeMode === 'year_incoming') {
                                    return sizeFromRatio(globalMaxYearIncoming > 0 ? yearIncoming / globalMaxYearIncoming : 0)
                                  }

                                  if (nodeSizeMode === 'net_visible') {
                                    const maxAbs = maxAbsNetVisible > 0 ? maxAbsNetVisible : 1
                                    return sizeFromRatio(netVisible / maxAbs)
                                  }

                                  if (nodeSizeMode === 'net_year') {
                                    const netAbsDenominator = globalNetAbs > 0 ? globalNetAbs : 1
                                    return sizeFromRatio(netYear / netAbsDenominator)
                                  }

                                  if (nodeSizeMode === 'self_year') {
                                    const maxSelf = datasetNodeSelfFlowStats?.max ?? 0
                                    const ratio = maxSelf > 0 ? selfYear / maxSelf : 0
                                    return sizeFromRatio(ratio)
                                  }

                                  if (nodeSizeMode === 'attribute' && nodeSizeAttribute) {
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
                                    return sizeFromRatio(normalized)
                                  }
                                  
                                  return 6
                                },
                                // Edge width
                                edgeWidth: (e: any) => {
                                  const style = (e as any)?.__overlayStyle ?? edgeStyleSetting
                                  const normalized = normalizeEdgeWeight(e.value)
                                  const weightedWidth =
                                    edgeWidthMode === 'weight'
                                      ? 0.5 + normalized * (style === 'segmented' ? 12 : 15)
                                      : baseEdgeWidth

                                  if (style === 'outline') {
                                    return Math.max(2.5, baseEdgeWidth)
                                  }

                                  if (style === 'segmented') {
                                    if (edgeWidthMode === 'weight') {
                                      return weightedWidth
                                    }
                                    return Math.max(baseEdgeWidth, 2)
                                  }

                                  return weightedWidth
                                },
                                
                                // Edge color (supports advanced hue/intensity sources)
                                edgeColor: (e: any, isAbove: boolean) => {
                                  const temporalDelta = e?.__temporalDelta
                                  if (overlayActive && temporalDelta) {
                                    return overlayEdgeColor(temporalDelta)
                                  }
                                  if (shouldColorEdgesByEgoStep) {
                                    const step = e?._egoStep ?? 0
                                    if (step > 0) {
                                      return computeEgoStepColor(step)
                                    }
                                  }
                                  const weightNorm = normalizeEdgeWeight(e.value)

                                  // Helper: categorical palette
                                  const palette = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

                                  // Advanced off: keep legacy simple modes via mapping to hue/intensity
                                  if (!edgeColorAdvanced) {
                                    if (edgeColorHue === 'direction') {
                                      return isAbove ? '#1f77b4' : '#d62728'
                                    }
                                  }

                                  // Compute hue color
                                  let hueColor = '#2563eb'
                                  if (edgeColorHue === 'direction') {
                                    hueColor = isAbove ? '#1f77b4' : '#d62728'
                                  } else if (edgeColorHue === 'region') {
                                    const src = filteredData.nodes.find((n: any) => n.id === e.source)
                                    const regions = Array.from(new Set(filteredData.nodes.map((n: any) => n.region).filter(Boolean)))
                                    const map = new Map(regions.map((r, idx) => [r, palette[idx % palette.length]]))
                                    hueColor = (src && src.region) ? (map.get(src.region) || '#2563eb') : '#2563eb'
                                  } else if (edgeColorHue === 'division') {
                                    const src = filteredData.nodes.find((n: any) => n.id === e.source)
                                    const divs = Array.from(new Set(filteredData.nodes.map((n: any) => n.division).filter(Boolean)))
                                    const map = new Map(divs.map((d, idx) => [d, palette[idx % palette.length]]))
                                    hueColor = (src && src.division) ? (map.get(src.division) || '#2563eb') : '#2563eb'
                                  } else if (edgeColorHue === 'attribute' && edgeColorHueAttribute) {
                                    const val = (e as any)[edgeColorHueAttribute]
                                    if (val != null) {
                                      if (dataset?.metadata?.hasNumericProperties.edges.includes(edgeColorHueAttribute)) {
                                        const allVals = filteredData.baseEdges.map((ed: any) => ed[edgeColorHueAttribute]).filter((v: any) => typeof v === 'number') as number[]
                                        const minVal = Math.min(...allVals)
                                        const maxVal = Math.max(...allVals)
                                        const range = maxVal - minVal || 1
                                        const n = (Number(val) - minVal) / range
                                        const hue = 120 - (n * 120)
                                        hueColor = `hsl(${hue}, 70%, 50%)`
                                      } else {
                                        const uniq = Array.from(new Set(filteredData.baseEdges.map((ed: any) => ed[edgeColorHueAttribute]).filter((v: any) => v != null)))
                                        const map = new Map(uniq.map((v, idx) => [v, palette[idx % palette.length]]))
                                        hueColor = map.get(val) || '#2563eb'
                                      }
                                    }
                                  } else if (edgeColorHue === 'single') {
                                    hueColor = '#2563eb'
                                  }

                                  // Compute intensity [0..1]
                                  let intensity = 0.6
                                  if (edgeColorIntensity === 'weight') {
                                    intensity = Math.max(0, Math.min(1, weightNorm))
                                  } else if (edgeColorIntensity === 'attribute' && edgeColorIntensityAttribute) {
                                    const val = (e as any)[edgeColorIntensityAttribute]
                                    if (val != null && dataset?.metadata?.hasNumericProperties.edges.includes(edgeColorIntensityAttribute)) {
                                      const allVals = filteredData.baseEdges.map((ed: any) => ed[edgeColorIntensityAttribute]).filter((v: any) => typeof v === 'number') as number[]
                                      const minVal = Math.min(...allVals)
                                      const maxVal = Math.max(...allVals)
                                      const range = maxVal - minVal || 1
                                      intensity = Math.max(0, Math.min(1, (Number(val) - minVal) / range))
                                    }
                                  } else if (edgeColorIntensity === 'constant') {
                                    intensity = Math.max(0, Math.min(1, edgeColorIntensityConst))
                                  }

                                  // If inter-edges grayscale requested for region/division hue
                                  if (edgeColorInterGrayscale && (edgeColorHue === 'region' || edgeColorHue === 'division')) {
                                    const src = filteredData.nodes.find((n: any) => n.id === e.source)
                                    const tgt = filteredData.nodes.find((n: any) => n.id === e.target)
                                    const same = edgeColorHue === 'region' ? (src?.region && src.region === tgt?.region) : (src?.division && src.division === tgt?.division)
                                    if (!same) {
                                      const light = 80 - (intensity * 50)
                                      return `hsl(0, 0%, ${light}%)`
                                    }
                                  }

                                  // Apply intensity to hue color by adjusting lightness via HSL without external deps
                                  const light = 80 - (intensity * 55)
                                  // Direction hue
                                  if (edgeColorHue === 'direction') {
                                    const h = isAbove ? 0 : 200
                                    return `hsl(${h}, 70%, ${Math.round(light)}%)`
                                  }
                                  // Single hue
                                  if (edgeColorHue === 'single') {
                                    return `hsl(210, 70%, ${Math.round(light)}%)`
                                  }
                                  // Region/Division hue keep categorical color (unless grayscale handled earlier)
                                  if (edgeColorHue === 'region' || edgeColorHue === 'division') {
                                    return hueColor
                                  }
                                  // Attribute hue using computed HSL
                                  return hueColor
                                },
                                nodeStroke: (d: any) => {
                                  const delta = d.temporal_overlay_delta ?? 0
                                  const baseColor = d.__baseFillColor ?? resolveBaseNodeColor(d)
                                  if (!overlayActive || overlayDeltaMax <= 0) {
                                    const width = nodeOutlineActive ? 2.5 : 2
                                    const color = nodeOutlineActive ? baseColor : '#fff'
                                    return { color, width }
                                  }
                                  if (!delta) {
                                    const width = nodeOutlineActive ? 2.5 : 1.5
                                    const color = nodeOutlineActive ? baseColor : '#d1d5db'
                                    return { color, width }
                                  }
                                  const ratio = Math.min(1, Math.abs(delta) / overlayDeltaMax)
                                  if (nodeOutlineActive) {
                                    const width = 2.5 + ratio * 1.5
                                    return { color: baseColor, width }
                                  }
                                  const hue = delta >= 0 ? 0 : 210
                                  const lightness = 70 - ratio * 25
                                  const width = 2 + ratio * 2
                                  return { color: `hsl(${Math.round(hue)}, 75%, ${Math.round(lightness)}%)`, width }
                                },
                              }
                            })()}
                            legend={(() => {
                              // Build legend from current color settings
                              const temporalOverlayInfo = filteredData.temporalOverlay
                              if (temporalOverlayInfo && (temporalOverlayInfo.hasPast || temporalOverlayInfo.hasFuture)) {
                                const entries: Array<{ label: string; color: string }> = []
                                if (temporalOverlayInfo.hasPast) {
                                  entries.push({ label: 'Past years', color: 'hsl(210, 75%, 55%)' })
                                }
                                if (temporalOverlayInfo.hasFuture) {
                                  entries.push({ label: 'Future years', color: 'hsl(0, 75%, 55%)' })
                                }
                                return { type: 'temporalOverlay' as const, entries }
                              }

                              const egoStepMax = filteredData.egoStepMax ?? 0
                              const shouldColorEdgesByEgoStep = Boolean(egoNodeId && egoStepColoring && egoStepMax > 0)
                              if (shouldColorEdgesByEgoStep) {
                                const colorForStep = (step: number) => {
                                  if (egoStepMax <= 1) {
                                    return 'hsl(210, 80%, 55%)'
                                  }
                                  const clamped = Math.max(1, Math.min(step, egoStepMax))
                                  const ratio = egoStepMax <= 1 ? 0 : (clamped - 1) / (egoStepMax - 1)
                                  const hue = 210 - ratio * 150
                                  const lightness = 60 - ratio * 20
                                  return `hsl(${Math.round(hue)}, 80%, ${Math.round(lightness)}%)`
                                }
                                const entries = Array.from({ length: egoStepMax }, (_, index) => ({
                                  step: index + 1,
                                  color: colorForStep(index + 1),
                                }))
                                return { type: 'egoSteps' as const, entries }
                              }

                              const edgeWeightsForLegend = filteredData.baseEdges.map((e: any) => e.value)
                              const minEdgeWeightLegend = edgeWeightsForLegend.length > 0 ? Math.min(...edgeWeightsForLegend) : 0
                              const maxEdgeWeightLegend = edgeWeightsForLegend.length > 0 ? Math.max(...edgeWeightsForLegend) : 1
                              const globalMinLegend = datasetEdgeStats?.min ?? minEdgeWeightLegend
                              const globalMaxLegend = datasetEdgeStats?.max ?? maxEdgeWeightLegend
                              const legendWeightSpan = Math.max(globalMaxLegend - globalMinLegend, 0)

                              const normalizeEdgeWeightForLegend = (value: number) => {
                                if (!Number.isFinite(value) || legendWeightSpan <= 0) return 0
                                const clamped = Math.min(
                                  Math.max(value, globalMinLegend),
                                  globalMaxLegend,
                                )
                                const shifted = clamped - globalMinLegend
                                switch (edgeWeightScale) {
                                  case 'sqrt': {
                                    const denom = Math.sqrt(legendWeightSpan)
                                    if (denom <= 0) return 0
                                    return Math.max(0, Math.min(1, Math.sqrt(shifted) / denom))
                                  }
                                  case 'log': {
                                    const denom = Math.log10(legendWeightSpan + 1)
                                    if (!Number.isFinite(denom) || denom <= 0) return 0
                                    return Math.max(0, Math.min(1, Math.log10(shifted + 1) / denom))
                                  }
                                  case 'linear':
                                  default: {
                                    if (legendWeightSpan <= 0) return 0
                                    return Math.max(0, Math.min(1, shifted / legendWeightSpan))
                                  }
                                }
                              }

                              const valueForFractionForLegend = (fraction: number) => {
                                if (legendWeightSpan <= 0) return globalMinLegend
                                const clampedF = Math.max(0, Math.min(1, fraction))
                                switch (edgeWeightScale) {
                                  case 'sqrt':
                                    return globalMinLegend + Math.pow(clampedF, 2) * legendWeightSpan
                                  case 'log': {
                                    const denom = Math.log10(legendWeightSpan + 1)
                                    if (!Number.isFinite(denom) || denom <= 0) return globalMinLegend
                                    const increment = Math.pow(10, clampedF * denom) - 1
                                    return globalMinLegend + increment
                                  }
                                  case 'linear':
                                  default:
                                    return globalMinLegend + clampedF * legendWeightSpan
                                }
                              }

                              if (!edgeColorAdvanced) {
                                if (edgeColorHue === 'direction') {
                                  return { type: 'direction' as const }
                                }
                                if (edgeColorHue === 'single' && edgeColorIntensity === 'weight') {
                                  const sampleFractions = [0, 0.5, 1]
                                  const samples = sampleFractions.map((fraction) => {
                                    const value = valueForFractionForLegend(fraction)
                                    const normalized = normalizeEdgeWeightForLegend(value)
                                    const intensity = normalized
                                    const light = 80 - (intensity * 55)
                                    const color = `hsl(210, 70%, ${Math.round(light)}%)`
                                    const width = edgeWidthMode === 'weight' ? 0.5 + normalized * 15 : baseEdgeWidth
                                    return {
                                      fraction: normalized,
                                      value,
                                      color,
                                      width,
                                    }
                                  })
                                  return {
                                    type: 'weight' as const,
                                    color: '#1f77b4',
                                    scale: edgeWeightScale,
                                    min: globalMinLegend,
                                    max: globalMaxLegend,
                                    samples,
                                  }
                                }
                              } else {
                                if (edgeColorHue === 'region' && hasRegionData) {
                                  const regions = Array.from(new Set(filteredData.nodes.map((n: any) => n.region).filter(Boolean))) as string[]
                                  const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                                  const entries = regions.slice(0, 10).map((r, i) => ({ label: r, color: colors[i % colors.length] }))
                                  return { type: 'categorical' as const, title: 'Regions', entries, interNote: edgeColorInterGrayscale ? 'Inter edges: grayscale by intensity' : undefined }
                                }
                                if (edgeColorHue === 'division' && hasDivisionData) {
                                  const divs = Array.from(new Set(filteredData.nodes.map((n: any) => n.division).filter(Boolean))) as string[]
                                  const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
                                  const entries = divs.slice(0, 10).map((d, i) => ({ label: d, color: colors[i % colors.length] }))
                                  return { type: 'categorical' as const, title: 'Divisions', entries, interNote: edgeColorInterGrayscale ? 'Inter edges: grayscale by intensity' : undefined }
                                }
                                if (edgeColorHue === 'single' && edgeColorIntensity === 'weight') {
                                  const sampleFractions = [0, 0.5, 1]
                                  const samples = sampleFractions.map((fraction) => {
                                    const value = valueForFractionForLegend(fraction)
                                    const normalized = normalizeEdgeWeightForLegend(value)
                                    const intensity = normalized
                                    const light = 80 - (intensity * 55)
                                    const color = `hsl(210, 70%, ${Math.round(light)}%)`
                                    const width =
                                      edgeWidthMode === 'weight'
                                        ? 0.5 + normalized * 15
                                        : baseEdgeWidth
                                    return {
                                      fraction: normalized,
                                      value,
                                      color,
                                      width,
                                    }
                                  })
                                  return {
                                    type: 'weight' as const,
                                    color: '#1f77b4',
                                    scale: edgeWeightScale,
                                    min: globalMinLegend,
                                    max: globalMaxLegend,
                                    samples,
                                  }
                                }
                              }
                              return undefined
                            })()}
                            lens={{ enabled: interactionMode === 'lens', x: lensPos.x, y: lensPos.y, radius: lensRadius }}
                            onMouseMoveInCanvas={(pt) => {
                              if (interactionMode === 'lens') setLensPos(pt)
                            }}
                            onWheelInCanvas={(deltaY) => {
                              if (interactionMode === 'lens') {
                                setLensRadius((r) => Math.max(20, Math.min(300, r + (deltaY > 0 ? -10 : 10))))
                              }
                            }}
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
                            <TableView nodes={filteredData.nodes} edges={filteredData.baseEdges} />
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
                              edges={filteredData.baseEdges} 
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
                            edges={filteredData.baseEdges} 
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
                    <div className="px-6 py-8 text-center text-gray-600 space-y-3">
                      {typeof currentYear === 'number' && YEAR_PLACEHOLDER_MESSAGES[currentYear] ? (
                        <>
                          <p className="text-lg font-semibold text-gray-700">
                            No state-to-state migration snapshot for {currentYear}
                          </p>
                          <p className="text-sm leading-relaxed">
                            {YEAR_PLACEHOLDER_MESSAGES[currentYear]}
                          </p>
                        </>
                      ) : (
                        <p>No snapshot to display.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {viewType === 'kriskogram' && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded shadow border border-gray-200">
                  <label className="text-xs font-medium text-gray-700">Mode:</label>
                  <button
                    type="button"
                    onClick={() => setInteractionMode("pan")}
                    className={[
                      'text-xs px-2 py-1 rounded border',
                      interactionMode === 'pan'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300',
                    ].join(' ')}
                  >
                    Pan
                  </button>
                  <button
                    type="button"
                    onClick={() => setInteractionMode("lens")}
                    className={[
                      'text-xs px-2 py-1 rounded border',
                      interactionMode === 'lens'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300',
                    ].join(' ')}
                  >
                    Edge Lens
                  </button>
                  {interactionMode === 'lens' && (
                    <span className="text-[10px] text-gray-600">Wheel: radius ({lensRadius}px)</span>
                  )}
                </div>
              )}
              </>
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
                <CollapsibleSection
                  title="General Settings"
                  defaultOpen={true}
                  onReset={() => {
                    const edgesUpperBound = Math.max(1, datasetMaxEdgesCount)
                    setEdgeTypeFilter(null)
                    setIntraFilter('none')
                    setMinThreshold(datasetMinEdgeValue)
                    setMaxThreshold(datasetMaxEdgeValue)
                    setMaxEdges(edgesUpperBound)
                    updateSearchParams({
                      edgeType: null,
                      minThreshold: datasetMinEdgeValue,
                      maxThreshold: datasetMaxEdgeValue,
                      maxEdges: edgesUpperBound,
                    })
                  }}
                >
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

                    {/* Intra/Inter edge scope filter */}
                    {(hasRegionData || hasDivisionData) && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Edge Scope</label>
                        <select
                          value={intraFilter}
                          onChange={(e) => setIntraFilter(e.target.value as typeof intraFilter)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">All</option>
                          {hasRegionData && <option value="region">Intra Region</option>}
                          {hasDivisionData && <option value="division">Intra Division</option>}
                          {hasRegionData && <option value="interRegion">Inter Region</option>}
                          {hasDivisionData && <option value="interDivision">Inter Division</option>}
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
                          const edgesUpperBound = Math.max(1, datasetMaxEdgesCount)
                          const isFiltered =
                            minThreshold > datasetMinEdgeValue ||
                            maxThreshold < datasetMaxEdgeValue ||
                            maxEdges < edgesUpperBound
                          return (
                            <button
                              onClick={() => {
                                setMinThreshold(datasetMinEdgeValue)
                                setMaxThreshold(datasetMaxEdgeValue)
                                setMaxEdges(edgesUpperBound)
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
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={datasetMinEdgeValue}
                          max={sliderMaxValue || 1}
                          step={sliderStep}
                          value={minThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            const newMin = Math.min(val, maxThreshold)
                            setMinThreshold(newMin)
                            updateSearchParams({ minThreshold: newMin })
                          }}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={datasetMinEdgeValue}
                          max={sliderMaxValue || 1}
                          value={minThreshold}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value)
                            if (Number.isNaN(val)) return
                            const clamped = Math.max(datasetMinEdgeValue, Math.min(val, maxThreshold))
                            setMinThreshold(clamped)
                            updateSearchParams({ minThreshold: clamped })
                          }}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span>Max: {maxThreshold.toLocaleString()}</span>
                        {effectiveMaxEdgeValue !== undefined && effectiveMaxEdgeValue < maxThreshold && (
                          <span className="text-xs text-gray-400">(actual {effectiveMaxEdgeValue.toLocaleString()})</span>
                        )}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={datasetMinEdgeValue}
                          max={sliderMaxValue || 1}
                          step={sliderStep}
                          value={maxThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            const newMax = Math.max(val, minThreshold)
                            setMaxThreshold(newMax)
                            updateSearchParams({ maxThreshold: newMax })
                          }}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={datasetMinEdgeValue}
                          max={sliderMaxValue || 1}
                          value={maxThreshold}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value)
                            if (Number.isNaN(val)) return
                            const clamped = Math.min(sliderMaxValue || 1, Math.max(val, minThreshold))
                            setMaxThreshold(clamped)
                            updateSearchParams({ maxThreshold: clamped })
                          }}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Max Edges: {maxEdges}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={maxEdgesUpperBound}
                          step={10}
                          value={maxEdges}
                          onChange={(e) => {
                            const newMaxEdges = parseInt(e.target.value)
                            setMaxEdges(newMaxEdges)
                            updateSearchParams({ maxEdges: newMaxEdges })
                          }}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={1}
                          max={maxEdgesUpperBound}
                          value={maxEdges}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value)
                            if (Number.isNaN(val)) return
                            const clamped = Math.max(1, Math.min(val, maxEdgesUpperBound))
                            setMaxEdges(clamped)
                            updateSearchParams({ maxEdges: clamped })
                          }}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
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
                  <CollapsibleSection
                    title="Kriskogram Settings"
                    defaultOpen={true}
                    onReset={() => {
                      setShowAllNodes(false)
                      setNodeOrderMode('alphabetical')
                      setArcOpacity(0.85)
                      setEdgeWidthMode('weight')
                      setBaseEdgeWidth(2)
                      setNodeColorMode('single')
                      setNodeColorAttribute(null)
                      setNodeSizeMode('fixed')
                      setNodeSizeAttribute(null)
                      setEdgeColorAdvanced(false)
                      setEdgeColorHue('direction')
                      setEdgeColorHueAttribute(null)
                      setEdgeColorInterGrayscale(true)
                      setEdgeColorIntensity('weight')
                      setEdgeColorIntensityAttribute(null)
                      setEdgeColorIntensityConst(0.6)
                      setInteractionMode('pan')
                      setLensRadius(80)
                      setLensPos({ x: 0, y: 0 })
                      setEgoNodeId(null)
                      setEgoNeighborSteps(1)
                      setEgoStepColoring(false)
                      setEdgeWeightScale('linear')
                      setTemporalOverlayEnabled(false)
                      setTemporalOverlayEdgeStyle('filled')
                      setTemporalOverlayNodeStyle('filled')
                      setTemporalOverlayYears(1)
                      setEdgeSegmentLength(8)
                      setEdgeSegmentGap(4)
                      setEdgeSegmentOffset(0)
                      setEdgeSegmentCap('round')
                      setEdgeSegmentAnimate(false)
                      setEdgeOutlineGap(3)
                      updateSearchParams({
                        showAllNodes: false,
                        egoNodeId: null,
                        egoNeighborSteps: 1,
                        egoStepColoring: false,
                        temporalOverlay: false,
                        temporalOverlayYears: 1,
                        temporalOverlayEdgeStyle: 'filled',
                        temporalOverlayNodeStyle: 'filled',
                        edgeSegmentLength: 8,
                        edgeSegmentGap: 4,
                        edgeSegmentOffset: 0,
                        edgeSegmentCap: 'round',
                        edgeSegmentAnimate: false,
                        edgeWeightScale: 'linear',
                        edgeOutlineGap: 3,
                      })
                    }}
                  >
                    {dataset?.metadata ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                          <div>
                            <label htmlFor="kriskogram-show-all-nodes" className="text-sm font-medium text-gray-700">
                              Always show all nodes
                            </label>
                            <p className="text-xs text-gray-500">
                              Keeps every location visible even if its edges fall outside the filters.
                            </p>
                          </div>
                          <input
                            id="kriskogram-show-all-nodes"
                            type="checkbox"
                            className="w-4 h-4"
                            checked={showAllNodes}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setShowAllNodes(checked)
                              updateSearchParams({ showAllNodes: checked })
                            }}
                          />
                        </div>

                        <div className="space-y-3 border border-gray-200 rounded-md p-3">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ego Focus</div>
                          <div>
                            <label htmlFor="kriskogram-ego-node" className="text-xs font-medium text-gray-700">
                              Ego focus (optional)
                            </label>
                            <select
                              id="kriskogram-ego-node"
                              value={egoNodeId ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                const nextValue = value === '' ? null : value
                                if (nextValue === null) {
                                  setEgoNodeId(null)
                                  if (egoStepColoring) {
                                    setEgoStepColoring(false)
                                  }
                                  updateSearchParams({ egoNodeId: null, egoStepColoring: false })
                                } else {
                                  setEgoNodeId(nextValue)
                                  updateSearchParams({ egoNodeId: nextValue })
                                }
                              }}
                              className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">No ego focus (show all eligible edges)</option>
                              {((currentSnapshot?.nodes ?? []) as any[]).map((node: any) => (
                                <option key={node.id} value={node.id}>
                                  {node.label || node.id}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Limit the visualization to flows centered on a selected node.
                            </p>
                          </div>

                          <div>
                            <label htmlFor="kriskogram-ego-steps" className="text-xs font-medium text-gray-700">
                              Neighbor steps
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                id="kriskogram-ego-steps"
                                type="number"
                                min={1}
                                max={10}
                                value={egoNeighborSteps}
                                disabled={!egoNodeId}
                                onChange={(e) => {
                                  const raw = Number.parseInt(e.target.value, 10)
                                  if (Number.isNaN(raw)) return
                                  const clamped = Math.max(1, Math.min(raw, 10))
                                  setEgoNeighborSteps(clamped)
                                  updateSearchParams({ egoNeighborSteps: clamped })
                                }}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                              />
                              <span className="text-[11px] text-gray-500">
                                How many hops from the ego node to include (based on currently visible edges).
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <label htmlFor="kriskogram-ego-step-coloring" className="text-xs font-medium text-gray-700">
                                Color edges by neighbor step
                              </label>
                              <p className="text-[11px] text-gray-500">
                                Apply a step-based gradient for ego flows and show it in the legend.
                              </p>
                            </div>
                            <input
                              id="kriskogram-ego-step-coloring"
                              type="checkbox"
                              className="w-4 h-4"
                              disabled={!egoNodeId}
                              checked={egoStepColoring && Boolean(egoNodeId)}
                              onChange={(e) => {
                                const checked = e.target.checked && Boolean(egoNodeId)
                                setEgoStepColoring(checked)
                                updateSearchParams({ egoStepColoring: checked })
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Edge and node styling options are available in the sections below.
                          </p>
                        </div>

                        <div className="space-y-3 border border-gray-200 rounded-md p-3">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Temporal Overlay</div>
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-xs font-medium text-gray-700" htmlFor="kriskogram-temporal-overlay">
                                Show neighboring years
                              </label>
                              <p className="text-[11px] text-gray-500">
                                Overlay edges from nearby years to compare past and future flows.
                              </p>
                            </div>
                            <input
                              id="kriskogram-temporal-overlay"
                              type="checkbox"
                              className="w-4 h-4"
                              disabled={!dataset || dataset.timeRange.start === dataset.timeRange.end || typeof currentYear !== 'number'}
                              checked={temporalOverlayEnabled && dataset?.timeRange.start !== dataset?.timeRange.end}
                              onChange={(e) => {
                                const enabled = e.target.checked
                                setTemporalOverlayEnabled(enabled)
                                updateSearchParams({ temporalOverlay: enabled })
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700" htmlFor="kriskogram-temporal-overlay-years">
                              Neighbor years
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                id="kriskogram-temporal-overlay-years"
                                type="number"
                                min={1}
                                max={10}
                                value={temporalOverlayYears}
                                disabled={!temporalOverlayEnabled}
                                onChange={(e) => {
                                  const raw = Number.parseInt(e.target.value, 10)
                                  if (Number.isNaN(raw)) return
                                  const clamped = Math.max(1, Math.min(raw, 10))
                                  setTemporalOverlayYears(clamped)
                                  updateSearchParams({ temporalOverlayYears: clamped })
                                }}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                              />
                              <span className="text-[11px] text-gray-500">
                                Include the selected number of years before and after the current year.
                              </span>
                            </div>
                            {(!dataset || dataset.timeRange.start === dataset.timeRange.end) && (
                              <p className="mt-2 text-[11px] text-gray-400 italic">
                                Temporal overlay is unavailable because this dataset has a single year.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Node Ordering */}
                        <div className="space-y-3 border border-gray-200 rounded-md p-3">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Node</div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Node Ordering</label>
                            <select
                              value={nodeOrderMode}
                              onChange={(e) => setNodeOrderMode(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="alphabetical">Alphabetical</option>
                              {dataset.metadata.hasCategoricalProperties.nodes.map((prop) => (
                                <option key={prop} value={prop}>
                                  By {prop}
                                </option>
                              ))}
                              {dataset.metadata.hasNumericProperties.nodes.map((prop) => (
                                <option key={prop} value={prop}>
                                  By {prop}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Node Color */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Node Color</label>
                            <select
                              value={nodeColorMode}
                              onChange={(e) => setNodeColorMode(e.target.value as typeof nodeColorMode)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="single">Single Color</option>
                              <option value="visible_outgoing">Visible Outgoing Flow</option>
                              <option value="visible_incoming">Visible Incoming Flow</option>
                              <option value="year_outgoing">Year Outgoing Flow</option>
                              <option value="year_incoming">Year Incoming Flow</option>
                              <option value="net_year">Net Flow (year)</option>
                              <option value="self_year">Self Flow (year)</option>
                              <option value="attribute">By Attribute</option>
                            </select>
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
                            <select
                              value={nodeSizeMode}
                              onChange={(e) => setNodeSizeMode(e.target.value as typeof nodeSizeMode)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="visible_outgoing">Visible Outgoing Flow</option>
                              <option value="visible_incoming">Visible Incoming Flow</option>
                              <option value="year_outgoing">Year Outgoing Flow</option>
                              <option value="year_incoming">Year Incoming Flow</option>
                              <option value="net_visible">Net Flow (visible)</option>
                              <option value="net_year">Net Flow (year)</option>
                              <option value="self_year">Self Flow (year)</option>
                              <option value="attribute">By Attribute</option>
                            </select>
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

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700" htmlFor="kriskogram-node-styling">
                              Node styling
                            </label>
                            <p className="text-[11px] text-gray-500">
                              Control how nodes are rendered. Outline mode hides the fill and emphasizes the stroke.
                            </p>
                            <select
                              id="kriskogram-node-styling"
                              value={temporalOverlayNodeStyle}
                              onChange={(e) => {
                                const next = e.target.value as 'filled' | 'outline'
                                setTemporalOverlayNodeStyle(next)
                                updateSearchParams({ temporalOverlayNodeStyle: next })
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="filled">Filled nodes</option>
                              <option value="outline">Outline only</option>
                            </select>
                          </div>
                        </div>

                        {/* Arc Opacity */}
                        <div className="space-y-3 border border-gray-200 rounded-md p-3">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Edge</div>
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

                          {/* Edge Width */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Edge Width</label>
                            <div className="flex items-center gap-3 text-xs">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="edgeWidthMode"
                                  value="weight"
                                  checked={edgeWidthMode === 'weight'}
                                  onChange={() => setEdgeWidthMode('weight')}
                                  className="w-3.5 h-3.5"
                                />
                                <span>By Weight</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="edgeWidthMode"
                                  value="fixed"
                                  checked={edgeWidthMode === 'fixed'}
                                  onChange={() => setEdgeWidthMode('fixed')}
                                  className="w-3.5 h-3.5"
                                />
                                <span>Fixed</span>
                              </label>
                            </div>
                            {edgeWidthMode === 'fixed' && (
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
                            <div className="mt-2 space-y-1">
                              <label className="text-xs font-medium text-gray-700">Weight scaling</label>
                              <select
                                value={edgeWeightScale}
                                onChange={(e) => {
                                  const value = e.target.value as 'linear' | 'sqrt' | 'log'
                                  setEdgeWeightScale(value)
                                  updateSearchParams({ edgeWeightScale: value })
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="linear">Linear (use raw weight differences)</option>
                                <option value="sqrt">Square root (compress extremes)</option>
                                <option value="log">Logarithmic (highlight small flows)</option>
                              </select>
                              <p className="text-[11px] text-gray-500">
                                Applies to both edge widths and weight-based color intensity.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700" htmlFor="kriskogram-edge-style">
                              Line styling
                            </label>
                            <p className="text-[11px] text-gray-500">
                              Choose how edges are drawn. Segmented uses dashed arcs; outline shows a thin perimeter.
                            </p>
                            <select
                              id="kriskogram-edge-style"
                              value={temporalOverlayEdgeStyle}
                              onChange={(e) => {
                                const next = e.target.value as 'segmented' | 'filled' | 'outline'
                                setTemporalOverlayEdgeStyle(next)
                                updateSearchParams({ temporalOverlayEdgeStyle: next })
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="filled">Filled (solid weight)</option>
                              <option value="segmented">Segmented (dashed)</option>
                              <option value="outline">Outline only</option>
                            </select>
                            {temporalOverlayEdgeStyle === 'segmented' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600">
                                    Dash length (px)
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    step={0.5}
                                    value={edgeSegmentLength}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value)
                                      if (Number.isNaN(val)) return
                                      const clamped = Math.max(1, val)
                                      setEdgeSegmentLength(clamped)
                                      updateSearchParams({ edgeSegmentLength: clamped })
                                    }}
                                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600">
                                    Gap length (px)
                                  </label>
                                  <input
                                    type="number"
                                    min={0.5}
                                    step={0.5}
                                    value={edgeSegmentGap}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value)
                                      if (Number.isNaN(val)) return
                                      const clamped = Math.max(0.5, val)
                                      setEdgeSegmentGap(clamped)
                                      updateSearchParams({ edgeSegmentGap: clamped })
                                    }}
                                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600">
                                    Initial gap (px)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={edgeSegmentOffset}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value)
                                      if (Number.isNaN(val)) return
                                      const clamped = Math.max(0, val)
                                      setEdgeSegmentOffset(clamped)
                                      updateSearchParams({ edgeSegmentOffset: clamped })
                                    }}
                                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            )}
                            {temporalOverlayEdgeStyle === 'segmented' && (
                              <div className="mt-2 space-y-2">
                                <div>
                                  <label className="text-[11px] font-medium text-gray-600" htmlFor="kriskogram-edge-cap">
                                    Segment cap style
                                  </label>
                                  <select
                                    id="kriskogram-edge-cap"
                                    value={edgeSegmentCap}
                                    onChange={(e) => {
                                      const next = e.target.value as 'round' | 'butt'
                                      setEdgeSegmentCap(next)
                                      updateSearchParams({ edgeSegmentCap: next })
                                    }}
                                    className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="round">Rounded segment ends</option>
                                    <option value="butt">Sharp segment ends</option>
                                  </select>
                                </div>
                                <label className="flex items-center justify-between text-[11px] font-medium text-gray-600">
                                  <span>Animate flow</span>
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5"
                                    checked={edgeSegmentAnimate}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setEdgeSegmentAnimate(checked)
                                      updateSearchParams({ edgeSegmentAnimate: checked })
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                            {temporalOverlayEdgeStyle === 'outline' && (
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600">
                                    Outline gap (px)
                                  </label>
                                  <input
                                    type="range"
                                    min={0}
                                    max={12}
                                    step={0.5}
                                    value={edgeOutlineGap}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value)
                                      if (Number.isNaN(val)) return
                                      const clamped = Math.max(0, val)
                                      setEdgeOutlineGap(clamped)
                                      updateSearchParams({ edgeOutlineGap: clamped })
                                    }}
                                    className="mt-1 w-full"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600">
                                    Precise value
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={edgeOutlineGap}
                                    onChange={(e) => {
                                      const val = Number.parseFloat(e.target.value)
                                      if (Number.isNaN(val)) return
                                      const clamped = Math.max(0, val)
                                      setEdgeOutlineGap(clamped)
                                      updateSearchParams({ edgeOutlineGap: clamped })
                                    }}
                                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Edge Color */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-700">Edge Color</label>
                                {egoNodeId && egoStepColoring && (
                                  <span className="text-[11px] text-gray-400">(disabled by neighbor step coloring)</span>
                                )}
                              </div>
                              <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5"
                                  disabled={Boolean(egoNodeId && egoStepColoring)}
                                  checked={edgeColorAdvanced}
                                  onChange={(e) => {
                                    const checked = e.target.checked
                                    if (egoNodeId && egoStepColoring) {
                                      return
                                    }
                                    setEdgeColorAdvanced(checked)
                                    if (!checked) {
                                      setEdgeColorHue('direction')
                                      setEdgeColorHueAttribute(null)
                                      setEdgeColorInterGrayscale(true)
                                      setEdgeColorIntensity('weight')
                                      setEdgeColorIntensityAttribute(null)
                                      setEdgeColorIntensityConst(0.6)
                                    }
                                  }}
                                />
                                Advanced
                              </label>
                            </div>
                            {!edgeColorAdvanced && !(egoNodeId && egoStepColoring) && (
                              <div className="flex flex-col gap-1.5 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="edgeColorHueSimple"
                                    value="direction"
                                    checked={edgeColorHue === 'direction'}
                                    onChange={() => setEdgeColorHue('direction')}
                                    className="w-3.5 h-3.5"
                                  />
                                  <span>By Direction (Above/Below)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="edgeColorHueSimple"
                                    value="single"
                                    checked={edgeColorHue === 'single'}
                                    onChange={() => setEdgeColorHue('single')}
                                    className="w-3.5 h-3.5"
                                  />
                                  <span>Single Color</span>
                                </label>
                              </div>
                            )}

                            {edgeColorAdvanced && !(egoNodeId && egoStepColoring) && (
                              <div className="mt-2 space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50/60">
                                <div>
                                  <label className="text-xs font-medium text-gray-700">
                                    Hue Source
                                  </label>
                                  <select
                                    value={edgeColorHue}
                                    onChange={(e) => setEdgeColorHue(e.target.value as typeof edgeColorHue)}
                                    className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="direction">Direction (Above/Below)</option>
                                    <option value="single">Single</option>
                                    <option value="region" disabled={!hasRegionData}>Region</option>
                                    <option value="division" disabled={!hasDivisionData}>Division</option>
                                    <option value="attribute">Attribute</option>
                                  </select>
                                  {edgeColorHue === 'attribute' && dataset?.metadata && (
                                    <div className="mt-2">
                                      <label className="text-xs text-gray-600">Hue Attribute</label>
                                      <select
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={edgeColorHueAttribute || ''}
                                        onChange={(e) => setEdgeColorHueAttribute(e.target.value || null)}
                                      >
                                        <option value="">Select attribute…</option>
                                        {dataset.metadata.hasCategoricalProperties.edges.concat(dataset.metadata.hasNumericProperties.edges).map((prop) => (
                                          <option key={prop} value={prop}>
                                            {prop}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Intensity Source</label>
                                  <select
                                    value={edgeColorIntensity}
                                    onChange={(e) => setEdgeColorIntensity(e.target.value as typeof edgeColorIntensity)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="weight">Weight</option>
                                    <option value="constant">Constant</option>
                                    <option value="attribute">Attribute</option>
                                  </select>
                                  {edgeColorIntensity === 'constant' && (
                                    <div className="mt-2">
                                      <label className="text-xs text-gray-600">Constant Intensity: {(edgeColorIntensityConst*100).toFixed(0)}%</label>
                                      <input type="range" min={0} max={1} step={0.01} value={edgeColorIntensityConst} onChange={(e) => setEdgeColorIntensityConst(parseFloat(e.target.value))} className="w-full" />
                                    </div>
                                  )}
                                  {edgeColorIntensity === 'attribute' && dataset?.metadata && (
                                    <div className="mt-2">
                                      <label className="text-xs text-gray-600">Intensity Attribute</label>
                                      <select className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={edgeColorIntensityAttribute || ''} onChange={(e) => setEdgeColorIntensityAttribute(e.target.value || null)}>
                                        <option value="">Select attribute…</option>
                                        {dataset.metadata.hasNumericProperties.edges.map((prop) => (<option key={prop} value={prop}>{prop}</option>))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
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
  // Preload defaults if missing: multi-year CSV series, single-year CSV 2021, sample GEXF, and Swiss Relocations
  const preId = 'csv-usa-pre-2020'
  const postId = 'csv-usa-post-2020'
  const csvId = 'csv-2021'
  const gexfId = 'gexf-sample'
  const swissId = 'swiss-2016'

  let existingPre = await getDataset(preId)
  let existingPost = await getDataset(postId)

  const hasCompleteCoverage = (dataset: StoredDataset | undefined) => {
    if (!dataset) return false
    return dataset.snapshots.every((snapshot) => {
      const labels = new Set(snapshot.nodes.map((node: any) => node.label))
      if (labels.size !== EXPECTED_STATE_COUNT) return false
      for (const label of labels) {
        if (!STATE_LABEL_SET.has(label)) return false
      }
      return true
    })
  }

  const needsPreRefresh = existingPre ? !hasCompleteCoverage(existingPre) : false
  if (needsPreRefresh) {
    await deleteDataset(preId).catch(() => {})
    existingPre = undefined
  }

  const needsPostRefresh = existingPost ? !hasCompleteCoverage(existingPost) : false
  if (needsPostRefresh) {
    await deleteDataset(postId).catch(() => {})
    existingPost = undefined
  }

  let preAvailable = !!existingPre
  let postAvailable = !!existingPost
  const existingCsv = await getDataset(csvId)
  const existingGexf = await getDataset(gexfId)
  const existingSwiss = await getDataset(swissId)

  const buildSnapshots = async (entries: typeof STATE_MIGRATION_CSV_FILES) => {
    const snapshots: KriskogramSnapshot[] = []
    for (const entry of entries) {
      try {
        const csvUrl = new URL(`../data/StateToStateMigrationUSCSV/${entry.filename}`, import.meta.url)
        const csvText = await loadCSVFromUrl(csvUrl.toString())
        const parsed = parseStateMigrationCSV(csvText)
        snapshots.push({
          timestamp: entry.year,
          nodes: parsed.nodes as any[],
          edges: parsed.edges as any[],
        })
      } catch (error) {
        console.warn(`⚠️ Failed to load snapshot for ${entry.filename}:`, error)
      }
    }
    snapshots.sort((a, b) => {
      const ta = typeof a.timestamp === 'string' ? Number.parseInt(a.timestamp, 10) : a.timestamp
      const tb = typeof b.timestamp === 'string' ? Number.parseInt(b.timestamp, 10) : b.timestamp
      return ta - tb
    })
    return snapshots
  }

  if (!existingPre) {
    const preEntries = STATE_MIGRATION_CSV_FILES.filter((entry) => entry.year <= 2019)
    const preSnapshots = await buildSnapshots(preEntries)

    if (preSnapshots.length > 0) {
      const first = preSnapshots[0]
      const last = preSnapshots[preSnapshots.length - 1]
      const metadata = detectDatasetProperties(first)

      const ds: StoredDataset = {
        id: preId,
        name: 'US State-to-State Migration (2005-2019)',
        notes:
          'Tidy ACS 1-year state-to-state migration flows from 2005 through 2019. The Census Bureau did not release 2020 1-year migration flows, so the series stops before the pandemic.',
        type: 'csv',
        timeRange: {
          start: typeof first.timestamp === 'string' ? Number.parseInt(first.timestamp, 10) : first.timestamp,
          end: typeof last.timestamp === 'string' ? Number.parseInt(last.timestamp, 10) : last.timestamp,
        },
        snapshots: preSnapshots,
        metadata,
        createdAt: Date.now(),
      }

      await saveDataset(ds)
      preAvailable = true
    }
  }

  if (!existingPost) {
    const postEntries = STATE_MIGRATION_CSV_FILES.filter((entry) => entry.year >= 2021)
    const postSnapshots = await buildSnapshots(postEntries)

    if (postSnapshots.length > 0) {
      const first = postSnapshots[0]
      const last = postSnapshots[postSnapshots.length - 1]
      const metadata = detectDatasetProperties(first)

      const ds: StoredDataset = {
        id: postId,
        name: 'US State-to-State Migration (2021-2023)',
        notes:
          'Post-2020 ACS 1-year state-to-state migration flows. The 2022 release includes revised Connecticut flows per Census errata guidance.',
        type: 'csv',
        timeRange: {
          start: typeof first.timestamp === 'string' ? Number.parseInt(first.timestamp, 10) : first.timestamp,
          end: typeof last.timestamp === 'string' ? Number.parseInt(last.timestamp, 10) : last.timestamp,
        },
        snapshots: postSnapshots,
        metadata,
        createdAt: Date.now(),
      }

      await saveDataset(ds)
      postAvailable = true
    }
  }

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

  if (preAvailable) {
    return preId
  }
  if (postAvailable) {
    return postId
  }
  if (existingCsv) {
    return csvId
  }

  return undefined
}


