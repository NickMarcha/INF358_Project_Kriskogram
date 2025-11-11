/**
 * Data Adapters for Different Visualization Types
 * 
 * These adapters convert the common node/edge format to formats required
 * by specific visualization libraries (d3-sankey, d3-chord, etc.)
 */

export interface CommonNode {
  id: string
  label?: string
  [key: string]: unknown
}

export interface CommonEdge {
  source: string
  target: string
  value: number
  [key: string]: unknown
}

/**
 * Sankey Diagram Data Format
 * 
 * d3-sankey expects:
 * - nodes: array with unique identifiers
 * - links: array with source/target as indices (or node objects) and value
 */
export interface SankeyNode {
  id: string
  name: string
  [key: string]: unknown
}

export interface SankeyLink {
  source: number | string | SankeyNode  // Index, ID, or reference to node (depends on nodeId usage)
  target: number | string | SankeyNode  // Index, ID, or reference to node (depends on nodeId usage)
  value: number
  [key: string]: unknown
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

/**
 * Chord Diagram Data Format
 * 
 * d3-chord expects:
 * - matrix: square matrix where matrix[i][j] = flow from node i to node j
 * - nodes: array of node labels/properties
 */
export interface ChordData {
  matrix: number[][]
  labels: string[]
  nodes: CommonNode[]  // Keep original node data
}

/**
 * Convert common node/edge format to Sankey format
 * 
 * Compatibility: Direct - Sankey supports the same structure
 * Only need to ensure source/target are properly indexed
 */
export function toSankeyFormat(
  nodes: CommonNode[],
  edges: CommonEdge[]
): SankeyData {
  // Create node map for quick lookup
  const nodeMap = new Map<string, number>()
  const sankeyNodes: SankeyNode[] = nodes.map((node, index) => {
    nodeMap.set(node.id, index)
    const { id, ...nodeRest } = node
    return {
      id,
      name: node.label || node.id,
      ...nodeRest,
    }
  })

  // Convert edges to links
  // Note: For d3-sankey with nodeId, links should reference node IDs, not indices
  // Filter out self-loops and ensure both nodes exist
  const sankeyLinks: SankeyLink[] = edges
    .filter(edge => {
      // Only include edges where both source and target exist
      // Exclude self-loops (source === target) as they cause circular link errors
      return nodeMap.has(edge.source) && 
             nodeMap.has(edge.target) && 
             edge.source !== edge.target
    })
    .map(edge => ({
      source: edge.source,  // Use ID, not index (d3-sankey will resolve via nodeId)
      target: edge.target,  // Use ID, not index
      value: edge.value,
      ...Object.fromEntries(
        Object.entries(edge).filter(([key]) => 
          key !== 'source' && key !== 'target' && key !== 'value'
        )
      ),
    }))

  return {
    nodes: sankeyNodes,
    links: sankeyLinks,
  }
}

/**
 * Convert common node/edge format to Chord format
 * 
 * Compatibility: Requires transformation to matrix
 * - Matrix is n×n where n = number of nodes
 * - matrix[i][j] = value of edge from node i to node j
 * - Handles bidirectional flows naturally
 */
export function toChordFormat(
  nodes: CommonNode[],
  edges: CommonEdge[]
): ChordData {
  const n = nodes.length
  
  // Create node index map
  const nodeMap = new Map<string, number>()
  nodes.forEach((node, index) => {
    nodeMap.set(node.id, index)
  })

  // Initialize matrix with zeros
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0))

  // Fill matrix with edge values
  edges.forEach(edge => {
    const sourceIdx = nodeMap.get(edge.source)
    const targetIdx = nodeMap.get(edge.target)
    
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      matrix[sourceIdx][targetIdx] += edge.value
    }
  })

  // Extract labels
  const labels = nodes.map(node => node.label || node.id)

  return {
    matrix,
    labels,
    nodes,
  }
}

/**
 * Filter edges by a property value
 * 
 * Useful for filtering by edge types (e.g., migration_type: 'economic')
 * or filtering to show only specific edge categories
 */
export function filterEdgesByProperty(
  edges: CommonEdge[],
  property: string,
  value: string | null  // null means "show all"
): CommonEdge[] {
  if (!value || value === 'all') {
    return edges
  }

  return edges.filter(edge => {
    const propValue = edge[property]
    // Handle both exact match and array membership
    if (Array.isArray(propValue)) {
      return propValue.includes(value)
    }
    return propValue === value
  })
}

/**
 * Aggregate edges by property value
 * 
 * Combines multiple edges between same source/target pairs
 * when they have different property values (e.g., different migration_types)
 */
export function aggregateEdgesByProperty(
  edges: CommonEdge[],
  groupBy: 'source' | 'target' | 'source-target' = 'source-target'
): CommonEdge[] {
  const edgeMap = new Map<string, CommonEdge>()

  edges.forEach(edge => {
    let key: string
    
    switch (groupBy) {
      case 'source':
        key = edge.source
        break
      case 'target':
        key = edge.target
        break
      case 'source-target':
      default:
        key = `${edge.source}→${edge.target}`
        break
    }

    if (edgeMap.has(key)) {
      const existing = edgeMap.get(key)!
      existing.value += edge.value
      // Merge other properties (last one wins for non-numeric)
      Object.keys(edge).forEach(k => {
        if (k !== 'source' && k !== 'target' && k !== 'value') {
          if (typeof edge[k] === 'number') {
            // Could average numeric properties, but for now just keep last
            existing[k] = edge[k]
          } else {
            existing[k] = edge[k]
          }
        }
      })
    } else {
      edgeMap.set(key, { ...edge })
    }
  })

  return Array.from(edgeMap.values())
}

/**
 * Get unique values for an edge property
 * 
 * Useful for populating filter dropdowns (e.g., migration_type options)
 */
export function getUniqueEdgePropertyValues(
  edges: CommonEdge[],
  property: string
): (string | number)[] {
  const values = new Set<string | number>()
  
  edges.forEach(edge => {
    const value = edge[property]
    if (value === null || value === undefined) {
      return
    }

    if (Array.isArray(value)) {
      value
        .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
        .forEach(v => values.add(v))
      return
    }

    if (typeof value === 'string' || typeof value === 'number') {
      values.add(value)
    }
  })

  return Array.from(values).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b
    }
    return String(a).localeCompare(String(b))
  })
}

/**
 * Break cycles in edges for Sankey compatibility
 * 
 * Sankey diagrams require acyclic graphs (no cycles).
 * This function breaks cycles by keeping only one direction of bidirectional flows.
 * Keeps the direction with the larger value, or source < target alphabetically if equal.
 */
export function breakCyclesForSankey(edges: CommonEdge[]): CommonEdge[] {
  const edgeMap = new Map<string, CommonEdge>()
  const bidirectionalPairs = new Set<string>()
  
  // First, identify bidirectional pairs (A→B and B→A)
  edges.forEach(edge => {
    if (edge.source === edge.target) return // Skip self-loops
    
    const pairKey = edge.source < edge.target 
      ? `${edge.source}|${edge.target}` 
      : `${edge.target}|${edge.source}`
    
    if (edgeMap.has(pairKey)) {
      bidirectionalPairs.add(pairKey)
    } else {
      edgeMap.set(pairKey, edge)
    }
  })
  
  // For bidirectional pairs, keep only one direction (prefer higher value, or alphabetical)
  const result: CommonEdge[] = []
  const processedPairs = new Set<string>()
  
  edges.forEach(edge => {
    if (edge.source === edge.target) return // Skip self-loops
    
    const pairKey = edge.source < edge.target 
      ? `${edge.source}|${edge.target}` 
      : `${edge.target}|${edge.source}`
    
    if (bidirectionalPairs.has(pairKey)) {
      if (!processedPairs.has(pairKey)) {
        // Find both directions
        const forward = edges.find(e => 
          e.source === edge.source && e.target === edge.target
        )
        const backward = edges.find(e => 
          e.source === edge.target && e.target === edge.source
        )
        
        if (forward && backward) {
          // Keep the one with larger value, or forward if equal
          if (forward.value >= backward.value) {
            result.push(forward)
          } else {
            result.push(backward)
          }
        } else if (forward) {
          result.push(forward)
        } else if (backward) {
          result.push(backward)
        }
        
        processedPairs.add(pairKey)
      }
      // Skip this edge if we've already processed this pair
    } else {
      // Not a bidirectional pair, keep it
      result.push(edge)
    }
  })
  
  return result
}

