import React, { useEffect, useState } from 'react'
import { X, Network } from 'lucide-react'
import Kriskogram from './Kriskogram'

type Edge = { source: string; target: string; value: number }

const NODES = [
  { id: 'A', label: 'A' },
  { id: 'B', label: 'B' },
  { id: 'C', label: 'C' },
  { id: 'D', label: 'D' },
]

function makeEdges(pairs: Array<[string, string]>, weight = 10): Edge[] {
  return pairs.map(([s, t]) => ({ source: s, target: t, value: weight }))
}

const PATTERNS = [
  {
    title: 'All Connected',
    variants: [
      makeEdges([
        ['A','B'],['A','C'],['A','D'],['B','A'],['B','C'],['B','D'],['C','A'],['C','B'],['C','D'],['D','A'],['D','B'],['D','C']
      ], 8),
      makeEdges([
        ['A','B'],['A','C'],['A','D'],['B','C'],['B','D'],['C','D']
      ], 12),
    ],
  },
  {
    title: 'Partially Connected',
    variants: [
      makeEdges([
        ['A','B'],['A','D'],['B','A'],['B','C'],['C','B'],['C','D'],['D','A'],['D','C']
      ]),
      makeEdges([
        ['A','C'],['B','D'],['C','A'],['D','B']
      ], 14),
    ],
  },
  {
    title: 'Separated Regional',
    variants: [
      makeEdges([
        ['A','B'],['B','A'],['C','D'],['D','C']
      ], 16),
      makeEdges([
        ['A','D'],['D','A'],['B','C'],['C','B']
      ], 16),
    ],
  },
  {
    title: 'Isolated Units',
    variants: [
      makeEdges([
        ['A','B'],['A','C'],['B','A'],['B','C'],['C','A'],['C','B']
      ], 10),
      makeEdges([
        ['B','C'],['C','B'],['C','D'],['D','B'],['D','C']
      ]),
    ],
  },
  {
    title: 'Sources',
    variants: [
      makeEdges([
        ['A','B'],['A','C'],['A','D']
      ], 18),
      makeEdges([
        ['A','B'],['A','C'],['A','D'],['C','A'],['C','B'],['C','D']
      ], 12),
    ],
  },
  {
    title: 'Sinks',
    variants: [
      makeEdges([
        ['A','B'],['C','B'],['D','B']
      ], 18),
      makeEdges([
        ['A','B'],['A','D'],['B','D'],['C','B'],['C','D'],['D','B']
      ]),
    ],
  },
  {
    title: 'Hubs',
    variants: [
      makeEdges([
        ['A','B'],['B','C'],['C','A'],['C','D'],['D','A'],['D','B']
      ]),
      makeEdges([
        ['A','B'],['B','A'],['B','C'],['B','D'],['C','B'],['D','B']
      ], 14),
    ],
  },
  {
    title: 'Chains',
    variants: [
      makeEdges([
        ['A','B'],['B','C'],['C','D']
      ], 16),
      makeEdges([
        ['B','C'],['C','A'],['A','D']
      ], 16),
    ],
  },
]

function SimpleDiagram({ edges }: { edges: Edge[] }) {
  const size = 160
  const padding = 24
  const positions: Record<string, { x: number; y: number }> = {
    A: { x: padding, y: padding },
    D: { x: size - padding, y: padding },
    B: { x: padding, y: size - padding },
    C: { x: size - padding, y: size - padding },
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <marker id="arrow-small" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
          <path d="M 0 0 L 12 6 L 0 12 z" fill="#374151" />
        </marker>
      </defs>
      {(() => {
        const dirSet = new Set(edges.map(e => `${e.source}->${e.target}`))
        const pairKeys = new Set<string>()
        const pairs: Array<[string, string]> = []
        for (const e of edges) {
          const a = e.source
          const b = e.target
          if (!positions[a] || !positions[b] || a === b) continue
          const key = [a,b].sort().join('|')
          if (!pairKeys.has(key)) { pairKeys.add(key); pairs.push([a,b]) }
        }
        const out: React.ReactElement[] = []
        for (let i=0;i<pairs.length;i++){
          const [a,b] = pairs[i]
          const A = positions[a]
          const B = positions[b]
          const dx = B.x - A.x, dy = B.y - A.y
          const dist = Math.hypot(dx,dy) || 1
          const ux = dx/dist, uy = dy/dist
          const trim = dist * 0.10
          const nx = -uy, ny = ux
          const off = 12
          const sX = A.x + ux*trim, sY = A.y + uy*trim
          const eX = B.x - ux*trim, eY = B.y - uy*trim
          const hasAB = dirSet.has(`${a}->${b}`)
          const hasBA = dirSet.has(`${b}->${a}`)
          if (hasAB && hasBA) {
            out.push(<line key={`ab-${i}`} x1={sX+nx*off} y1={sY+ny*off} x2={eX+nx*off} y2={eY+ny*off} stroke="#374151" strokeWidth={2} markerEnd="url(#arrow-small)" />)
            out.push(<line key={`ba-${i}`} x1={eX-nx*off} y1={eY-ny*off} x2={sX-nx*off} y2={sY-ny*off} stroke="#374151" strokeWidth={2} markerEnd="url(#arrow-small)" />)
          } else if (hasAB) {
            out.push(<line key={`ab-${i}`} x1={sX} y1={sY} x2={eX} y2={eY} stroke="#374151" strokeWidth={2} markerEnd="url(#arrow-small)" />)
          } else if (hasBA) {
            out.push(<line key={`ba-${i}`} x1={eX} y1={eY} x2={sX} y2={sY} stroke="#374151" strokeWidth={2} markerEnd="url(#arrow-small)" />)
          }
        }
        return out
      })()}
      {Object.entries(positions).map(([id,p]) => (
        <g key={id}>
          <circle cx={p.x} cy={p.y} r={14} fill="#111827" />
          <text x={p.x} y={p.y+4} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>{id}</text>
        </g>
      ))}
    </svg>
  )
}

export default function PatternsPanel() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const fn = () => setOpen(true)
    window.addEventListener('open-patterns', fn as EventListener)
    return () => window.removeEventListener('open-patterns', fn as EventListener)
  }, [])

  return (
    <>
      {/* Floating bubble trigger top-right */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 right-4 z-40 bg-white border border-gray-200 shadow-lg rounded-full p-3 hover:bg-gray-50"
          aria-label="Open patterns"
          title="Open patterns"
          type="button"
        >
          <Network className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Right drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[475px] max-w-[90vw] bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="complementary"
        aria-label="Patterns"
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-gray-700" />
            <span className="font-semibold text-gray-800">Patterns</span>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100" aria-label="Close patterns">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="h-full overflow-auto p-3 space-y-4">
          {PATTERNS.map((p, idx) => (
            <div key={idx} className="space-y-2">
              <div className="text-sm font-semibold text-gray-800">{p.title}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-600 mb-1">Variant 1</div>
                  <div className="aspect-square">
                    <Kriskogram title={`${p.title} 1`} width={300} height={300} nodes={NODES} edges={p.variants[0]} accessors={{}} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-600 mb-1">Diagram 1</div>
                  <SimpleDiagram edges={p.variants[0]} />
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-600 mb-1">Variant 2</div>
                  <div className="aspect-square">
                    <Kriskogram title={`${p.title} 2`} width={300} height={300} nodes={NODES} edges={p.variants[1]} accessors={{}} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-600 mb-1">Diagram 2</div>
                  <SimpleDiagram edges={p.variants[1]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}


