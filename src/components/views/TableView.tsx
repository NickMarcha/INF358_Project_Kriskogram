import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'

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
}

export default function TableView({ nodes, edges }: TableViewProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'edges'>('nodes')

  // Dynamically extract all property keys from nodes
  const nodeColumns = useMemo<ColumnDef<Node, any>[]>(() => {
    if (nodes.length === 0) return []
    
    const allKeys = new Set<string>()
    nodes.forEach(node => {
      Object.keys(node).forEach(key => allKeys.add(key))
    })
    
    const keys = Array.from(allKeys)
    // Put id and label first if they exist
    const orderedKeys = [
      ...(keys.includes('id') ? ['id'] : []),
      ...(keys.includes('label') ? ['label'] : []),
      ...keys.filter(k => k !== 'id' && k !== 'label'),
    ]
    
    return orderedKeys.map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      accessorKey: key,
      cell: (info: any) => {
        const value = info.getValue()
        if (value === null || value === undefined) return '-'
        if (typeof value === 'number') return value.toLocaleString()
        return String(value)
      },
    }))
  }, [nodes])

  // Dynamically extract all property keys from edges
  const edgeColumns = useMemo<ColumnDef<Edge, any>[]>(() => {
    if (edges.length === 0) return []
    
    const allKeys = new Set<string>()
    edges.forEach(edge => {
      Object.keys(edge).forEach(key => allKeys.add(key))
    })
    
    const keys = Array.from(allKeys)
    // Put source, target, and value first if they exist
    const orderedKeys = [
      ...(keys.includes('source') ? ['source'] : []),
      ...(keys.includes('target') ? ['target'] : []),
      ...(keys.includes('value') ? ['value'] : []),
      ...keys.filter(k => k !== 'source' && k !== 'target' && k !== 'value'),
    ]
    
    return orderedKeys.map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      accessorKey: key,
      cell: (info: any) => {
        const value = info.getValue()
        if (value === null || value === undefined) return '-'
        if (typeof value === 'number') return value.toLocaleString()
        return String(value)
      },
    }))
  }, [edges])

  const nodeTable = useReactTable({
    data: nodes,
    columns: nodeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const edgeTable = useReactTable({
    data: edges,
    columns: edgeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const activeTable = activeTab === 'nodes' ? nodeTable : edgeTable
  const activeData = activeTab === 'nodes' ? nodes : edges

  return (
    <div className="h-full flex flex-col">
      {/* Tab buttons */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'nodes'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nodes ({nodes.length})
        </button>
        <button
          onClick={() => setActiveTab('edges')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'edges'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Edges ({edges.length})
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            {activeTable.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left font-semibold text-gray-700"
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
                          header.column.columnDef.header,
                          header.getContext()
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
          <tbody className="divide-y divide-gray-200">
            {activeTable.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {activeData.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No {activeTab} to display
          </div>
        )}
      </div>
    </div>
  )
}

