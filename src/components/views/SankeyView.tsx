import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as d3Sankey from 'd3-sankey'
import { toSankeyFormat, breakCyclesForSankey } from '../../lib/data-adapters'

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

interface SankeyViewProps {
  nodes: Node[]
  edges: Edge[]
  width?: number
  height?: number
}

type SankeyDirection = 'outgoing' | 'incoming'

interface SankeyNodeExtra extends d3Sankey.SankeyNode<d3Sankey.SankeyNodeExtraProperties, d3Sankey.SankeyLinkExtraProperties> {
  name: string
  [key: string]: any
}

interface SankeyLinkExtra extends d3Sankey.SankeyLink<SankeyNodeExtra, d3Sankey.SankeyLinkExtraProperties> {
  [key: string]: any
}

export default function SankeyView({ 
  nodes, 
  edges, 
  width = 1200, 
  height = 800 
}: SankeyViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [direction, setDirection] = useState<SankeyDirection>('outgoing')

  useEffect(() => {
    if (!svgRef.current || edges.length === 0 || nodes.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove()
      }
      return
    }

    // Clear previous rendering
    d3.select(svgRef.current).selectAll('*').remove()

    // Prepare edges for the selected direction
    const edgesToUse = direction === 'incoming' 
      ? edges.map(e => ({ ...e, source: e.target, target: e.source })) // Reverse for incoming
      : edges
    
    // Filter out self-loops and ensure acyclic structure
    const cleanEdges = edgesToUse.filter(e => {
      // Remove self-loops
      if (e.source === e.target) return false
      return true
    })
    
    // For bipartite Sankey, we need to ensure nodes only appear in one column
    // Identify pure sources (only appear as source, never as target) and pure targets
    const sourceNodeIds = new Set(cleanEdges.map(e => e.source))
    const targetNodeIds = new Set(cleanEdges.map(e => e.target))
    
    // Create strict bipartite: nodes that appear as source go to left, as target go to right
    // If a node appears in both, we need to choose one column (prefer source/left)
    const leftNodeIds = new Set<string>()
    const rightNodeIds = new Set<string>()
    
    cleanEdges.forEach(e => {
      if (sourceNodeIds.has(e.source) && !targetNodeIds.has(e.source)) {
        leftNodeIds.add(e.source)  // Pure source
      } else if (!sourceNodeIds.has(e.source)) {
        // This shouldn't happen, but handle it
      } else {
        // Appears as both source and target - put on left as source
        leftNodeIds.add(e.source)
      }
      
      if (targetNodeIds.has(e.target) && !sourceNodeIds.has(e.target)) {
        rightNodeIds.add(e.target)  // Pure target
      } else if (!targetNodeIds.has(e.target)) {
        // This shouldn't happen
      } else {
        // Appears as both - ensure it's NOT on left if it's on right, or vice versa
        if (!leftNodeIds.has(e.target)) {
          rightNodeIds.add(e.target)
        }
      }
    })
    
    // Filter edges to only those where source is in left column and target is in right column
    const bipartiteEdges = cleanEdges.filter(e => 
      leftNodeIds.has(e.source) && rightNodeIds.has(e.target) &&
      !leftNodeIds.has(e.target) && !rightNodeIds.has(e.source)  // Ensure strict bipartite
    )
    
    const relevantNodeIds = new Set<string>()
    bipartiteEdges.forEach(e => {
      relevantNodeIds.add(e.source)
      relevantNodeIds.add(e.target)
    })
    
    const relevantNodes = nodes.filter(n => relevantNodeIds.has(n.id))
    
    if (bipartiteEdges.length === 0 || relevantNodes.length === 0) {
      d3.select(svgRef.current)
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#666')
        .text('No edges to display for this direction')
      return
    }

    // Convert to Sankey format
    const sankeyData = toSankeyFormat(relevantNodes, bipartiteEdges)
    
    // Use the strict bipartite column assignments
    const leftColumnNodes: string[] = Array.from(leftNodeIds).filter(id => relevantNodeIds.has(id))
    const rightColumnNodes: string[] = Array.from(rightNodeIds).filter(id => relevantNodeIds.has(id))

    // Create Sankey generator
    const sankey = d3Sankey.sankey<SankeyNodeExtra, SankeyLinkExtra>()
      .nodeId((d) => (d as SankeyNodeExtra).id)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 5], [width - 1, height - 5]])

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    // Generate the Sankey diagram
    let graph: ReturnType<typeof sankey>
    try {
      graph = sankey({
        nodes: sankeyData.nodes.map((d) => ({
          ...d,
          id: d.id,
          name: d.name,
        })),
        links: sankeyData.links,
      })
      
      // Force bipartite layout: nodes in two columns
      const leftX = 50
      const rightX = width - 50 - 15  // nodeWidth is 15
      const margin = 5
      const availableHeight = height - 2 * margin
      
      // Separate nodes by column
      const leftNodes = graph.nodes.filter((n: any) => leftColumnNodes.includes(n.id))
      const rightNodes = graph.nodes.filter((n: any) => rightColumnNodes.includes(n.id))
      
      // Calculate total height needed for each column based on node values
      const getNodeValue = (node: any) => {
        const outgoing = graph.links.filter((l: any) => l.source === node).reduce((sum: number, l: any) => sum + (l.value || 0), 0)
        const incoming = graph.links.filter((l: any) => l.target === node).reduce((sum: number, l: any) => sum + (l.value || 0), 0)
        return Math.max(outgoing, incoming)
      }
      
      const totalLeftValue = leftNodes.reduce((sum, n: any) => sum + getNodeValue(n), 0)
      const totalRightValue = rightNodes.reduce((sum, n: any) => sum + getNodeValue(n), 0)
      
      // Position left column nodes
      let currentY = margin
      leftNodes.forEach((node: any) => {
        const nodeValue = getNodeValue(node)
        const nodeHeight = totalLeftValue > 0 ? (nodeValue / totalLeftValue) * availableHeight : availableHeight / leftNodes.length
        node.x0 = leftX
        node.x1 = leftX + 15
        node.y0 = currentY
        node.y1 = currentY + nodeHeight
        currentY += nodeHeight + 10  // Add padding
      })
      
      // Position right column nodes
      currentY = margin
      rightNodes.forEach((node: any) => {
        const nodeValue = getNodeValue(node)
        const nodeHeight = totalRightValue > 0 ? (nodeValue / totalRightValue) * availableHeight : availableHeight / rightNodes.length
        node.x0 = rightX
        node.x1 = rightX + 15
        node.y0 = currentY
        node.y1 = currentY + nodeHeight
        currentY += nodeHeight + 10  // Add padding
      })
      
      // Update link paths to new positions
      graph.links.forEach((link: any) => {
        // Links are already updated when we modify node positions
        // The sankeyLinkHorizontal() will use the current node positions
      })
      
    } catch (error) {
      console.error('Sankey layout error:', error)
      d3.select(svgRef.current)
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#d32f2f')
        .text(`Sankey layout error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return
    }
    
    const sankeyNodes = graph.nodes as SankeyNodeExtra[]
    const sankeyLinks = graph.links as SankeyLinkExtra[]

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('font', '12px sans-serif')

    // Create gradient definitions for links
    const defs = svg.append('defs')
    sankeyLinks.forEach((link, i) => {
      const gradientId = `gradient-${i}`
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0)

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color(String(link.source.index)))
        .attr('stop-opacity', 0.8)

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color(String(link.target.index)))
        .attr('stop-opacity', 0.8)

      // Store gradient ID in link data
      ;(link as any).gradientId = gradientId
    })

    // Add the links
    const link = svg.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', d3Sankey.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => `url(#${d.gradientId})`)
      .attr('stroke-width', (d) => Math.max(1, d.width))
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', (d: any) => Math.max(2, d.width + 2))
        
        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('transition', 'opacity 0.2s')
        
        const sourceName = (d.source as SankeyNodeExtra).name
        const targetName = (d.target as SankeyNodeExtra).name
        tooltip
          .html(`${sourceName} → ${targetName}<br/>${(d.value as number).toLocaleString()}`)
          .style('opacity', 1)
      })
      .on('mousemove', function(event) {
        const tooltip = d3.select('.tooltip')
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
      })
      .on('mouseout', function(d) {
        d3.select(this)
          .attr('stroke-opacity', 0.5)
          .attr('stroke-width', (d: any) => Math.max(1, d.width))
        d3.select('.tooltip').remove()
      })

    // Add the nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(sankeyNodes)
      .join('g')

    node.append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('fill', (d) => color(String(d.index)))
      .attr('stroke', (d) => d3.rgb(color(String(d.index))).darker())
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill', d3.rgb(color(String(d.index))).brighter(0.5))
        
        // Highlight connected links
        link
          .style('opacity', (l: any) => {
            return l.source === d || l.target === d ? 1 : 0.1
          })
      })
      .on('mouseout', function(d) {
        d3.select(this)
          .attr('fill', (d: any) => color(String(d.index)))
        link.style('opacity', 0.5)
      })

    // Add labels for nodes
    node.append('text')
      .attr('x', (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr('y', (d) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => (d.x0 < width / 2 ? 'start' : 'end'))
      .text((d) => (d as SankeyNodeExtra).name)
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#333')

  }, [nodes, edges, width, height, direction])

  return (
    <div className="w-full space-y-4">
      {/* Direction Selector */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <label className="text-sm font-medium">Flow Direction:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setDirection('outgoing')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              direction === 'outgoing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Outgoing
          </button>
          <button
            onClick={() => setDirection('incoming')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              direction === 'incoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Incoming
          </button>
        </div>
        <span className="text-xs text-gray-500">
          {direction === 'outgoing' ? 'Showing flows FROM nodes' : 'Showing flows TO nodes'}
        </span>
      </div>

      <svg ref={svgRef} className="border border-gray-200 rounded bg-white" />
    </div>
  )
}

