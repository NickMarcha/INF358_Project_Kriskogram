import { useMemo, useState, useEffect, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { formatDynamicFieldLabel, isInternalFieldKey } from '../../lib/flow-labels'

interface Edge {
  source: string
  target: string
  value: number
  [key: string]: any
}

interface Node {
  id: string
  label?: string
  [key: string]: any
}

interface TableViewProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onBlur?: () => void
  editable?: boolean
}

export default function TableView({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange,
  onBlur,
  editable = false 
}: TableViewProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'edges'>('nodes')
  const [editedNodes, setEditedNodes] = useState(nodes)
  const [editedEdges, setEditedEdges] = useState(edges)
  
  // Track pending updates to avoid unnecessary re-renders during typing
  const pendingNodesUpdate = useRef<Map<string, { key: string; value: any }>>(new Map())
  const pendingEdgesUpdate = useRef<Map<string, { key: string; value: any }>>(new Map())
  
  // Update local state when props change (but not from edits)
  useEffect(() => {
    // Only update if the data actually changed from props, not from our own edits
    setEditedNodes([...nodes])
    setEditedEdges([...edges])
    pendingNodesUpdate.current.clear()
    pendingEdgesUpdate.current.clear()
  }, [nodes, edges])

  // Dynamically extract all property keys from nodes
  const nodeColumns = useMemo<ColumnDef<Node, any>[]>(() => {
    const sourceNodes = editable ? editedNodes : nodes
    if (sourceNodes.length === 0) return []

    const allKeys = new Set<string>()
    sourceNodes.forEach((node) => {
      Object.keys(node).forEach((key) => {
        if (isInternalFieldKey(key)) {
          return
        }
        allKeys.add(key)
      })
    })

    const keys = Array.from(allKeys)
    const orderedKeys = [
      ...(keys.includes('id') ? ['id'] : []),
      ...(keys.includes('label') ? ['label'] : []),
      ...keys.filter((k) => k !== 'id' && k !== 'label'),
    ]

    return orderedKeys.map((key) => ({
      header: formatDynamicFieldLabel(key),
      accessorKey: key,
      cell: (info: any) => {
        const value = info.getValue()
        if (editable && key !== 'id') {
          // Use the actual row data, not index, in case table is sorted/filtered
          const rowData = info.row.original as Node
          const rowId = rowData.id
          // Find the actual index in editedNodes by ID
          const actualIndex = editedNodes.findIndex(n => n.id === rowId)
          
          if (actualIndex === -1) return <span>-</span>
          
          const currentValue = editedNodes[actualIndex]?.[key] ?? value
          const inputId = `${rowId}-${key}`
          
          return (
            <EditableInput
              key={inputId}
              id={inputId}
              type={typeof currentValue === 'number' ? 'number' : 'text'}
              initialValue={currentValue === null || currentValue === undefined ? '' : String(currentValue)}
              isNumber={typeof currentValue === 'number'}
              onBlur={(newValue: string) => {
                // Only update state on blur to avoid re-renders while typing
                const newNodes = [...editedNodes]
                const finalValue = typeof currentValue === 'number' ? parseFloat(newValue) || 0 : newValue
                newNodes[actualIndex] = { ...newNodes[actualIndex], [key]: finalValue }
                setEditedNodes(newNodes)
                onNodesChange?.(newNodes)
                onBlur?.()
              }}
            />
          )
        }
        if (value === null || value === undefined) return '-'
        if (typeof value === 'number') return value.toLocaleString()
        return String(value)
      },
    }))
  }, [nodes, editedNodes, editable])

  // Dynamically extract all property keys from edges
  const edgeColumns = useMemo<ColumnDef<Edge, any>[]>(() => {
    const sourceEdges = (editable ? editedEdges : edges).filter(
      (edge: any) => !edge?._overlayType && !edge?.__isOverlay,
    )
    if (sourceEdges.length === 0) return []

    const allKeys = new Set<string>()
    sourceEdges.forEach((edge) => {
      Object.keys(edge).forEach((key) => {
        if (isInternalFieldKey(key)) {
          return
        }
        allKeys.add(key)
      })
    })

    const keys = Array.from(allKeys)
    const orderedKeys = [
      ...(keys.includes('source') ? ['source'] : []),
      ...(keys.includes('target') ? ['target'] : []),
      ...(keys.includes('value') ? ['value'] : []),
      ...keys.filter((k) => k !== 'source' && k !== 'target' && k !== 'value'),
    ]

    return orderedKeys.map((key) => ({
      header: formatDynamicFieldLabel(key),
      accessorKey: key,
      cell: (info: any) => {
        const value = info.getValue()
        if (editable && key !== 'source' && key !== 'target') {
          // Use the actual row data to find by source/target pair
          const rowData = info.row.original as Edge
          // Find the actual edge by source/target since edges don't have unique IDs
          const actualIndex = editedEdges.findIndex(
            e => e.source === rowData.source && e.target === rowData.target && e.value === rowData.value
          )
          
          if (actualIndex === -1) {
            // Fallback: try just source/target
            const fallbackIndex = editedEdges.findIndex(
              e => e.source === rowData.source && e.target === rowData.target
            )
            if (fallbackIndex === -1) return <span>-</span>
            
            const currentValue = editedEdges[fallbackIndex]?.[key] ?? value
            const inputId = `${rowData.source}-${rowData.target}-${key}-fallback`
            
            return (
              <EditableInput
                key={inputId}
                id={inputId}
                type={typeof currentValue === 'number' ? 'number' : 'text'}
                initialValue={currentValue === null || currentValue === undefined ? '' : String(currentValue)}
                isNumber={typeof currentValue === 'number'}
                onBlur={(newValue: string) => {
                  // Only update state on blur to avoid re-renders while typing
                  const newEdges = [...editedEdges]
                  const finalValue = typeof currentValue === 'number' ? parseFloat(newValue) || 0 : newValue
                  newEdges[fallbackIndex] = { ...newEdges[fallbackIndex], [key]: finalValue }
                  setEditedEdges(newEdges)
                  onEdgesChange?.(newEdges)
                  onBlur?.()
                }}
              />
            )
          }
          
          const currentValue = editedEdges[actualIndex]?.[key] ?? value
          const inputId = `${rowData.source}-${rowData.target}-${key}`
          
          return (
            <EditableInput
              key={inputId}
              id={inputId}
              type={typeof currentValue === 'number' ? 'number' : 'text'}
              initialValue={currentValue === null || currentValue === undefined ? '' : String(currentValue)}
              isNumber={typeof currentValue === 'number'}
              onBlur={(newValue: string) => {
                // Only update state on blur to avoid re-renders while typing
                const newEdges = [...editedEdges]
                const finalValue = typeof currentValue === 'number' ? parseFloat(newValue) || 0 : newValue
                newEdges[actualIndex] = { ...newEdges[actualIndex], [key]: finalValue }
                setEditedEdges(newEdges)
                onEdgesChange?.(newEdges)
                onBlur?.()
              }}
            />
          )
        }
        if (value === null || value === undefined) return '-'
        if (typeof value === 'number') return value.toLocaleString()
        return String(value)
      },
    }))
  }, [edges, editedEdges, editable])

  const nodeDisplayData = editable ? editedNodes : nodes
  const edgeDisplayData = useMemo(() => {
    const source = editable ? editedEdges : edges
    return source.filter((edge: any) => !edge?._overlayType && !edge?.__isOverlay)
  }, [editable, editedEdges, edges])

  const nodeTable = useReactTable({
    data: nodeDisplayData,
    columns: nodeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  const edgeTable = useReactTable({
    data: edgeDisplayData,
    columns: edgeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  })

  const activeTable = activeTab === 'nodes' ? nodeTable : edgeTable

  return (
    <div className="h-full w-full flex flex-col" style={{ height: '100%', maxHeight: '100%' }}>
      {/* Tab buttons */}
      <div className="flex border-b mb-4 flex-shrink-0">
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'nodes'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nodes ({nodeDisplayData.length})
        </button>
        <button
          onClick={() => setActiveTab('edges')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'edges'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Edges ({edgeDisplayData.length})
        </button>
      </div>

      {/* Table container with fixed header and scrollable body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              {activeTable.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2 text-left font-semibold text-gray-700 bg-gray-50"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none hover:text-blue-600'
                              : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header as any,
                            header.getContext() as any
                          )}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {activeTable.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell as any, cell.getContext() as any)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {activeTable.getRowModel().rows.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No {activeTab} to display
            </div>
          )}
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Show</span>
          <select
            value={activeTable.getState().pagination.pageSize}
            onChange={(e) => {
              activeTable.setPageSize(Number(e.target.value))
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">entries</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            Page {activeTable.getState().pagination.pageIndex + 1} of{' '}
            {activeTable.getPageCount()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => activeTable.setPageIndex(0)}
              disabled={!activeTable.getCanPreviousPage()}
              className="px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {'<<'}
            </button>
            <button
              onClick={() => activeTable.previousPage()}
              disabled={!activeTable.getCanPreviousPage()}
              className="px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {'<'}
            </button>
            <button
              onClick={() => activeTable.nextPage()}
              disabled={!activeTable.getCanNextPage()}
              className="px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {'>'}
            </button>
            <button
              onClick={() => activeTable.setPageIndex(activeTable.getPageCount() - 1)}
              disabled={!activeTable.getCanNextPage()}
              className="px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {'>>'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Separate component for editable inputs to prevent re-renders from parent state updates
function EditableInput({
  id,
  type,
  initialValue,
  onBlur,
}: {
  id: string
  type: 'text' | 'number'
  initialValue: string
  isNumber?: boolean
  onBlur: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(initialValue)
  
  // Only update local value when initialValue changes from props AND input is not focused
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      setLocalValue(initialValue)
    }
  }, [initialValue])
  
  return (
    <input
      ref={inputRef}
      id={id}
      type={type}
      value={localValue}
      onChange={(e) => {
        // Update local state only - don't trigger parent re-renders
        setLocalValue(e.target.value)
      }}
      onBlur={(e) => {
        // Notify parent only on blur (when field is exited)
        onBlur(e.target.value)
      }}
      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      autoComplete="off"
    />
  )
}

