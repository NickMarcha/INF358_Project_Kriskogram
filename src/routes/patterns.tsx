import { createFileRoute } from '@tanstack/react-router'
import Kriskogram from '@/components/Kriskogram'
import type React from 'react'

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

const PATTERNS: Array<{
  key: string
  title: string
  variants: Array<{ name: string; edges: Edge[]; diagram: string }>
}> = [
  {
    key: 'all-connected',
    title: 'All Connected',
    variants: [
      {
        name: 'All connected 1',
        edges: makeEdges([
          ['A', 'B'], ['A', 'C'], ['A', 'D'],
          ['B', 'A'], ['B', 'C'], ['B', 'D'],
          ['C', 'A'], ['C', 'B'], ['C', 'D'],
          ['D', 'A'], ['D', 'B'], ['D', 'C'],
        ], 8),
        diagram: 'A-->B; A-->C; A-->D; B-->A; B-->C; B-->D; C-->A; C-->B; C-->D; D-->A; D-->B; D-->C;',
      },
      {
        name: 'All connected 2',
        edges: makeEdges([
          ['A', 'B'], ['A', 'C'], ['A', 'D'],
          ['B', 'C'], ['B', 'D'],
          ['C', 'D'],
        ], 12),
        diagram: 'A-->B; A-->C; A-->D; B-->C; B-->D; C-->D;',
      },
    ],
  },
  {
    key: 'partially-connected',
    title: 'Partially Connected',
    variants: [
      {
        name: 'Partially connected 1',
        edges: makeEdges([
          ['A', 'B'], ['A', 'D'],
          ['B', 'A'], ['B', 'C'],
          ['C', 'B'], ['C', 'D'],
          ['D', 'A'], ['D', 'C'],
        ]),
        diagram: 'A-->B; A-->D; B-->A; B-->C; C-->B; C-->D; D-->A; D-->C;',
      },
      {
        name: 'Partially connected 2',
        edges: makeEdges([
          ['A', 'C'],
          ['B', 'D'],
          ['C', 'A'],
          ['D', 'B'],
        ], 14),
        diagram: 'A-->C; B-->D; C-->A; D-->B;',
      },
    ],
  },
  {
    key: 'separated-regional',
    title: 'Separated Regional Migrations',
    variants: [
      {
        name: 'Separated regional 1',
        edges: makeEdges([
          ['A', 'B'], ['B', 'A'],
          ['C', 'D'], ['D', 'C'],
        ], 16),
        diagram: 'A<-->B; C<-->D;',
      },
      {
        name: 'Separated regional 2',
        edges: makeEdges([
          ['A', 'D'], ['D', 'A'],
          ['B', 'C'], ['C', 'B'],
        ], 16),
        diagram: 'A<-->D; B<-->C;',
      },
    ],
  },
  {
    key: 'isolated-units',
    title: 'Isolated Units',
    variants: [
      {
        name: 'Isolated units 1',
        edges: makeEdges([
          ['A', 'B'], ['A', 'C'],
          ['B', 'A'], ['B', 'C'],
          ['C', 'A'], ['C', 'B'],
        ], 10),
        diagram: 'A<-->B; A<-->C; B<-->C;',
      },
      {
        name: 'Isolated units 2',
        edges: makeEdges([
          ['B', 'C'],
          ['C', 'B'], ['C', 'D'],
          ['D', 'B'], ['D', 'C'],
        ]),
        diagram: 'B<-->C; C-->D; D-->B; D-->C;',
      },
    ],
  },
  {
    key: 'sources',
    title: 'Sources',
    variants: [
      {
        name: 'Sources 1',
        edges: makeEdges([
          ['A', 'B'], ['A', 'C'], ['A', 'D'],
        ], 18),
        diagram: 'A-->B; A-->C; A-->D;',
      },
      {
        name: 'Sources 2',
        edges: makeEdges([
          ['A', 'B'], ['A', 'C'], ['A', 'D'],
          ['C', 'A'], ['C', 'B'], ['C', 'D'],
        ], 12),
        diagram: 'A-->B; A-->C; A-->D; C-->A; C-->B; C-->D;',
      },
    ],
  },
  {
    key: 'sinks',
    title: 'Sinks',
    variants: [
      {
        name: 'Sinks 1',
        edges: makeEdges([
          ['A', 'B'],
          ['C', 'B'],
          ['D', 'B'],
        ], 18),
        diagram: 'A-->B; C-->B; D-->B;',
      },
      {
        name: 'Sinks 2',
        edges: makeEdges([
          ['A', 'B'], ['A', 'D'],
          ['B', 'D'],
          ['C', 'B'], ['C', 'D'],
          ['D', 'B'],
        ]),
        diagram: 'A-->B; A-->D; B-->D; C-->B; C-->D; D-->B;',
      },
    ],
  },
  {
    key: 'hubs',
    title: 'Hubs',
    variants: [
      {
        name: 'Hubs 1',
        edges: makeEdges([
          ['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'A'], ['D', 'B'],
        ]),
        diagram: 'A-->B; B-->C; C-->A,D; D-->A,B;',
      },
      {
        name: 'Hubs 2',
        edges: makeEdges([
          ['A', 'B'],
          ['B', 'A'], ['B', 'C'], ['B', 'D'],
          ['C', 'B'],
          ['D', 'B'],
        ], 14),
        diagram: 'A-->B; B<-->A; B<-->C; B<-->D; C-->B; D-->B;',
      },
    ],
  },
  {
    key: 'chains',
    title: 'Chains',
    variants: [
      {
        name: 'Chains 1',
        edges: makeEdges([
          ['A', 'B'], ['B', 'C'], ['C', 'D'],
        ], 16),
        diagram: 'A-->B-->C-->D;',
      },
      {
        name: 'Chains 2',
        edges: makeEdges([
          ['B', 'C'], ['C', 'A'], ['A', 'D'],
        ], 16),
        diagram: 'B-->C-->A-->D;',
      },
    ],
  },
]

export const Route = createFileRoute('/patterns')({
  component: PatternsPage,
})

function MiniKriskogram({ title, edges }: { title: string; edges: Edge[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
      <div className="w-full" style={{ aspectRatio: '1 / 1' }}>
        <Kriskogram
          title={title}
          width={384}
          height={384}
          nodes={NODES}
          edges={edges}
          accessors={{}}
        />
      </div>
    </div>
  )
}

function SimpleDiagram({ edges, title }: { edges: Edge[]; title: string }) {
  const size = 384
  const padding = 32
  const positions: Record<string, { x: number; y: number }> = {
    A: { x: padding, y: padding },
    D: { x: size - padding, y: padding },
    B: { x: padding, y: size - padding },
    C: { x: size - padding, y: size - padding },
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-sm font-semibold text-gray-700 mb-2">Diagram</div>
      <div className="w-full" style={{ aspectRatio: '1 / 1' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-diagram`}
        >
          <title id={`${title.replace(/\s+/g, '-').toLowerCase()}-diagram`}>{title}</title>
          <defs>
            <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
              <path d="M 0 0 L 12 6 L 0 12 z" fill="#374151" />
            </marker>
          </defs>

          {(() => {
            // Build lookup for directions and unique undirected pairs
            const dirSet = new Set(edges.map((edge) => `${edge.source}->${edge.target}`))
            const pairKeys = new Set<string>()
            const pairs: Array<[string, string]> = []
            for (const edge of edges) {
              const a = edge.source
              const b = edge.target
              if (!positions[a] || !positions[b] || a === b) continue
              const key = [a, b].sort().join('|')
              if (!pairKeys.has(key)) {
                pairKeys.add(key)
                pairs.push([a, b])
              }
            }

            const lines = pairs.map(([a, b]) => {
              const A = positions[a]
              const B = positions[b]
              const dx = B.x - A.x
              const dy = B.y - A.y
              const dist = Math.hypot(dx, dy) || 1
              const ux = dx / dist
              const uy = dy / dist
              // Trim 10% at both ends
              const trim = dist * 0.10
              const startBaseX = A.x + ux * trim
              const startBaseY = A.y + uy * trim
              const endBaseX = B.x - ux * trim
              const endBaseY = B.y - uy * trim
              // Parallel offset
              const nx = -uy
              const ny = ux
              const off = 12

              const hasAB = dirSet.has(`${a}->${b}`)
              const hasBA = dirSet.has(`${b}->${a}`)

              const paths: React.ReactElement[] = []
              const keyBase = `${a}-${b}`

              if (hasAB && hasBA) {
                // Two parallel lines equidistant from centerline
                const s1x = startBaseX + nx * off
                const s1y = startBaseY + ny * off
                const e1x = endBaseX + nx * off
                const e1y = endBaseY + ny * off

                const s2x = startBaseX - nx * off
                const s2y = startBaseY - ny * off
                const e2x = endBaseX - nx * off
                const e2y = endBaseY - ny * off

                paths.push(
                  <line
                    key={`${keyBase}-forward`}
                    x1={s1x}
                    y1={s1y}
                    x2={e1x}
                    y2={e1y}
                    stroke="#374151"
                    strokeWidth={2.25}
                    markerEnd="url(#arrow)"
                  />,
                )
                paths.push(
                  <line
                    key={`${keyBase}-reverse`}
                    x1={e2x}
                    y1={e2y}
                    x2={s2x}
                    y2={s2y}
                    stroke="#374151"
                    strokeWidth={2.25}
                    markerEnd="url(#arrow)"
                  />,
                )
              } else if (hasAB) {
                paths.push(
                  <line
                    key={`${keyBase}-forward`}
                    x1={startBaseX}
                    y1={startBaseY}
                    x2={endBaseX}
                    y2={endBaseY}
                    stroke="#374151"
                    strokeWidth={2.25}
                    markerEnd="url(#arrow)"
                  />,
                )
              } else if (hasBA) {
                paths.push(
                  <line
                    key={`${keyBase}-reverse`}
                    x1={endBaseX}
                    y1={endBaseY}
                    x2={startBaseX}
                    y2={startBaseY}
                    stroke="#374151"
                    strokeWidth={2.25}
                    markerEnd="url(#arrow)"
                  />,
                )
              }

              return paths
            })

            return lines
          })()}

          {Object.entries(positions).map(([id, p]) => (
            <g key={id}>
              <circle cx={p.x} cy={p.y} r={18} fill="#111827" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={14} fill="#ffffff" fontWeight={700}>
                {id}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function PatternsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Patterns in Kriskograms</h1>
        <p className="text-gray-700 mb-8 max-w-3xl">
          Below are eight established network migration patterns demonstrated with mini Kriskograms and simple diagrams.
          All examples use four nodes (A, B, C, D) and two variations per pattern.
        </p>

        <div className="space-y-8">
          {PATTERNS.map((p) => (
            <div key={p.key} className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{p.title}</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                <MiniKriskogram title={p.variants[0].name} edges={p.variants[0].edges} />
                <SimpleDiagram title={`${p.variants[0].name} diagram`} edges={p.variants[0].edges} />
                <MiniKriskogram title={p.variants[1].name} edges={p.variants[1].edges} />
                <SimpleDiagram title={`${p.variants[1].name} diagram`} edges={p.variants[1].edges} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PatternsPage

