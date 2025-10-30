import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as d3Sankey from 'd3-sankey'

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

interface SankeyNodeExtra extends d3Sankey.SankeyNode<d3Sankey.SankeyNodeExtraProperties, d3Sankey.SankeyLinkExtraProperties> {
  name: string
  originalId: string
  isLeft: boolean
  [key: string]: any
}

interface SankeyLinkExtra extends d3Sankey.SankeyLink<SankeyNodeExtra, d3Sankey.SankeyLinkExtraProperties> {
  [key: string]: any
}

interface NodeStats {
  id: string
  label: string
  outgoing: number
  incoming: number
}

export default function SankeyView({ 
  nodes, 
  edges, 
  width = 1200, 
  height = 800 
}: SankeyViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    if (!svgRef.current || edges.length === 0 || nodes.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove()
      }
      return
    }

    // Clear previous rendering
    d3.select(svgRef.current).selectAll('*').remove()

    // Calculate total outgoing and incoming for each node
    const nodeStats = new Map<string, NodeStats>()
    
    nodes.forEach(node => {
      nodeStats.set(node.id, {
        id: node.id,
        label: node.label || node.id,
        outgoing: 0,
        incoming: 0,
      })
    })

    edges.forEach(edge => {
      const sourceStats = nodeStats.get(edge.source)
      const targetStats = nodeStats.get(edge.target)
      
      if (sourceStats) {
        sourceStats.outgoing += edge.value
      }
      if (targetStats) {
        targetStats.incoming += edge.value
      }
    })

    // Filter nodes that have at least one connection
    const activeNodes = Array.from(nodeStats.values()).filter(
      n => n.outgoing > 0 || n.incoming > 0
    )

    if (activeNodes.length === 0) {
      d3.select(svgRef.current)
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#666')
        .text('No active nodes with flows')
      return
    }

    // Sort nodes by total flow (outgoing + incoming) descending
    activeNodes.sort((a, b) => (b.outgoing + b.incoming) - (a.outgoing + a.incoming))

    const leftX = 50
    const rightX = width - 50
    const margin = 20
    const nodeWidth = 15
    const nodeGap = 2
    const minNodeHeight = 5

    // Calculate total flow for scaling
    const totalOutgoing = activeNodes.reduce((sum, n) => sum + n.outgoing, 0)
    const totalIncoming = activeNodes.reduce((sum, n) => sum + n.incoming, 0)

    // First pass: calculate height needed based on proportional scaling
    const baseAvailableHeight = Math.max(height - 2 * margin, 400)
    
    // Calculate actual height needed for left nodes
    let leftHeightNeeded = margin
    activeNodes.forEach((node) => {
      const nodeHeight = totalOutgoing > 0 
        ? Math.max(minNodeHeight, (node.outgoing / totalOutgoing) * baseAvailableHeight)
        : Math.max(minNodeHeight, baseAvailableHeight / activeNodes.length)
      leftHeightNeeded += nodeHeight + nodeGap
    })

    // Calculate actual height needed for right nodes
    let rightHeightNeeded = margin
    activeNodes.forEach((node) => {
      const nodeHeight = totalIncoming > 0 
        ? Math.max(minNodeHeight, (node.incoming / totalIncoming) * baseAvailableHeight)
        : Math.max(minNodeHeight, baseAvailableHeight / activeNodes.length)
      rightHeightNeeded += nodeHeight + nodeGap
    })

    // Use the maximum height needed, with minimum constraint
    const actualHeight = Math.max(height, Math.max(leftHeightNeeded, rightHeightNeeded) + 100) // Add padding for labels
    const availableHeight = actualHeight - 2 * margin

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', actualHeight)
      .style('font', '12px sans-serif')

    // Position left column nodes (outgoing totals)
    let currentY = margin
    const leftNodesData = activeNodes.map((node, index) => {
      const nodeHeight = totalOutgoing > 0 
        ? Math.max(minNodeHeight, (node.outgoing / totalOutgoing) * availableHeight)
        : Math.max(minNodeHeight, availableHeight / activeNodes.length)
      const y = currentY
      currentY += nodeHeight + nodeGap
      return {
        node,
        x: leftX,
        y,
        height: Math.max(minNodeHeight, nodeHeight - nodeGap),
        side: 'left' as const,
        index,
      }
    })

    // Position right column nodes (incoming totals)
    currentY = margin
    const rightNodesData = activeNodes.map((node, index) => {
      const nodeHeight = totalIncoming > 0 
        ? Math.max(minNodeHeight, (node.incoming / totalIncoming) * availableHeight)
        : Math.max(minNodeHeight, availableHeight / activeNodes.length)
      const y = currentY
      currentY += nodeHeight + nodeGap
      return {
        node,
        x: rightX,
        y,
        height: Math.max(minNodeHeight, nodeHeight - nodeGap),
        side: 'right' as const,
        index,
      }
    })

    // Determine which edges to show based on selection
    let edgesToShow: Edge[] = []
    if (selectedNodeId && selectedSide) {
      if (selectedSide === 'left') {
        // Show edges where selected node is source
        edgesToShow = edges.filter(e => e.source === selectedNodeId && e.source !== e.target)
      } else {
        // Show edges where selected node is target
        edgesToShow = edges.filter(e => e.target === selectedNodeId && e.source !== e.target)
      }
    }

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    // Draw edges if there's a selection
    if (edgesToShow.length > 0) {
      // Create links for sankey
      const sankeyLinks = edgesToShow.map(edge => {
        const leftNode = leftNodesData.find(d => d.node.id === edge.source)
        const rightNode = rightNodesData.find(d => d.node.id === edge.target)

        if (!leftNode || !rightNode) return null

        // Calculate link path (simple curved path between left and right nodes)
        const sourceY = leftNode.y + leftNode.height / 2
        const targetY = rightNode.y + rightNode.height / 2

        return {
          edge,
          sourceX: leftNode.x + nodeWidth,
          sourceY,
          targetX: rightNode.x,
          targetY,
          value: edge.value,
          leftIndex: leftNode.index,
          rightIndex: rightNode.index,
        }
      }).filter((link): link is NonNullable<typeof link> => link !== null)

      // Scale link width by value
      const maxValue = Math.max(...sankeyLinks.map(l => l.value), 1)
      const minWidth = 2
      const maxWidth = 20

      // Draw links
      const linkGroup = svg.append('g').attr('class', 'links')
      
      sankeyLinks.forEach(link => {
        const linkWidth = minWidth + (link.value / maxValue) * (maxWidth - minWidth)
        
        // Create gradient
        const gradientId = `gradient-${link.leftIndex}-${link.rightIndex}`
        const gradient = svg.append('defs')
          .append('linearGradient')
          .attr('id', gradientId)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', link.sourceX)
          .attr('x2', link.targetX)
          .attr('y1', link.sourceY)
          .attr('y2', link.targetY)

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', color(String(link.leftIndex)))
          .attr('stop-opacity', 0.6)

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', color(String(link.rightIndex)))
          .attr('stop-opacity', 0.6)

        // Draw curved path
        const path = d3.path()
        const controlX = (link.sourceX + link.targetX) / 2
        path.moveTo(link.sourceX, link.sourceY)
        path.bezierCurveTo(
          controlX, link.sourceY,
          controlX, link.targetY,
          link.targetX, link.targetY
        )

        linkGroup.append('path')
          .attr('d', path.toString())
          .attr('stroke', `url(#${gradientId})`)
          .attr('stroke-width', linkWidth)
          .attr('fill', 'none')
          .attr('stroke-opacity', 0.6)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this)
              .attr('stroke-opacity', 1)
              .attr('stroke-width', linkWidth + 2)
            
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
            
            tooltip
              .html(`${link.edge.source} → ${link.edge.target}<br/>${link.value.toLocaleString()}`)
              .style('opacity', 1)
          })
          .on('mousemove', function(event) {
            const tooltip = d3.select('.tooltip')
            tooltip
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('stroke-opacity', 0.6)
              .attr('stroke-width', linkWidth)
            d3.select('.tooltip').remove()
          })
      })
    }

    // Draw left column nodes (outgoing)
    const leftNodeGroup = svg.append('g').attr('class', 'left-nodes')
    const leftNodes = leftNodeGroup
      .selectAll('g.node')
      .data(leftNodesData)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation()
        if (selectedNodeId === d.node.id && selectedSide === 'left') {
          // Deselect if clicking the same node
          setSelectedNodeId(null)
          setSelectedSide(null)
        } else {
          setSelectedNodeId(d.node.id)
          setSelectedSide('left')
        }
      })

    leftNodes.append('rect')
      .attr('width', nodeWidth)
      .attr('height', d => d.height)
      .attr('fill', (d, i) => color(String(i)))
      .attr('stroke', (d, i) => d3.rgb(color(String(i))).darker())
      .attr('stroke-width', d => 
        selectedNodeId === d.node.id && selectedSide === 'left' ? 3 : 1
      )
      .attr('opacity', d => 
        selectedNodeId && selectedSide === 'left' && selectedNodeId !== d.node.id ? 0.3 : 1
      )
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill', d3.rgb(color(String(d.index))).brighter(0.5))
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill', color(String(d.index)))
      })

    leftNodes.append('text')
      .attr('x', nodeWidth + 6)
      .attr('y', d => d.height / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .text(d => `${d.node.label} (${d.node.outgoing.toLocaleString()})`)
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#333')
      .attr('opacity', d => 
        selectedNodeId && selectedSide === 'left' && selectedNodeId !== d.node.id ? 0.3 : 1
      )

    // Draw right column nodes (incoming)
    const rightNodeGroup = svg.append('g').attr('class', 'right-nodes')
    const rightNodes = rightNodeGroup
      .selectAll('g.node')
      .data(rightNodesData)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation()
        if (selectedNodeId === d.node.id && selectedSide === 'right') {
          // Deselect if clicking the same node
          setSelectedNodeId(null)
          setSelectedSide(null)
        } else {
          setSelectedNodeId(d.node.id)
          setSelectedSide('right')
        }
      })

    rightNodes.append('rect')
      .attr('x', -nodeWidth)
      .attr('width', nodeWidth)
      .attr('height', d => d.height)
      .attr('fill', (d, i) => color(String(i)))
      .attr('stroke', (d, i) => d3.rgb(color(String(i))).darker())
      .attr('stroke-width', d => 
        selectedNodeId === d.node.id && selectedSide === 'right' ? 3 : 1
      )
      .attr('opacity', d => 
        selectedNodeId && selectedSide === 'right' && selectedNodeId !== d.node.id ? 0.3 : 1
      )
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill', d3.rgb(color(String(d.index))).brighter(0.5))
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill', color(String(d.index)))
      })

    rightNodes.append('text')
      .attr('x', -nodeWidth - 6)
      .attr('y', d => d.height / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text(d => `${d.node.label} (${d.node.incoming.toLocaleString()})`)
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#333')
      .attr('opacity', d => 
        selectedNodeId && selectedSide === 'right' && selectedNodeId !== d.node.id ? 0.3 : 1
      )

    // Add instruction text
    if (!selectedNodeId) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#666')
        .text('Click a node to see its connections')
    } else {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#333')
        .text(
          selectedSide === 'left' 
            ? `Showing outgoing flows from ${leftNodesData.find(d => d.node.id === selectedNodeId)?.node.label}`
            : `Showing incoming flows to ${rightNodesData.find(d => d.node.id === selectedNodeId)?.node.label}`
        )
    }

    // Add labels for columns
    svg.append('text')
      .attr('x', leftX + nodeWidth / 2)
      .attr('y', actualHeight - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('Outgoing')

    svg.append('text')
      .attr('x', rightX - nodeWidth / 2)
      .attr('y', actualHeight - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('Incoming')

    // Handle click outside to deselect
    svg.on('click', function(event) {
      if (event.target === svgRef.current || (event.target as SVGElement).tagName === 'svg') {
        setSelectedNodeId(null)
        setSelectedSide(null)
      }
    })

  }, [nodes, edges, width, height, selectedNodeId, selectedSide])

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="text-center text-xs text-gray-500 mb-2 flex-shrink-0">
        Interaction design inspired by{' '}
        <a
          href="https://peoplemov.in/#f_AF"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          peoplemov.in by Carlo Zapponi
        </a>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <svg ref={svgRef} className="border border-gray-200 rounded bg-white" />
      </div>
    </div>
  )
}
