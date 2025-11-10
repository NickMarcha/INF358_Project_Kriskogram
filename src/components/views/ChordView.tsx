import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { toChordFormat } from '../../lib/data-adapters'

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

interface ChordViewProps {
  nodes: Node[]
  edges: Edge[]
  width?: number
  height?: number
}

export default function ChordView({ 
  nodes, 
  edges, 
  width = 1000, 
  height = 800 
}: ChordViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || edges.length === 0 || nodes.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove()
      }
      return
    }

    // Clear previous rendering
    d3.select(svgRef.current).selectAll('*').remove()

    // Convert to chord format (matrix)
    const chordData = toChordFormat(nodes, edges)
    
    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const outerRadius = Math.min(width, height) * 0.5 - 40
    const innerRadius = outerRadius - 20

    // Create zoom and pan behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', function(event) {
        zoomGroup.attr('transform', event.transform.toString())
      })

    svg.call(zoomBehavior)

    // Create reset button
    const resetButton = svg.append('g')
      .attr('class', 'reset-button')
      .style('cursor', 'pointer')
      .attr('transform', `translate(${width - 120}, 10)`)
      .on('click', function() {
        svg.transition()
          .duration(750)
          .call(zoomBehavior.transform, d3.zoomIdentity)
      })

    resetButton.append('rect')
      .attr('width', 110)
      .attr('height', 30)
      .attr('rx', 4)
      .attr('fill', 'white')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)

    resetButton.append('text')
      .attr('x', 55)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .text('Reset View')

    // Create chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)

    const arcs = chord(chordData.matrix)
    const ribbon = d3.ribbon()
      .radius(innerRadius)

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    // Create group for zoom/pan
    const zoomGroup = svg.append('g').attr('class', 'zoom-group')

    // Create group for chord diagram
    const g = zoomGroup.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Add group arcs (outer arcs)
    const group = g.append('g')
      .selectAll('g')
      .data(arcs.groups)
      .join('g')

    group.append('path')
      .attr('fill', (d) => color(String(d.index)))
      .attr('stroke', (d) => d3.rgb(color(String(d.index))).darker().formatHex())
      .attr('d', d3.arc<d3.ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius))
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill', d3.rgb(color(String(d.index))).brighter(1).formatHex())
        // Highlight connected chords
        g.selectAll('path.chord')
          .style('opacity', (p: any) => {
            return p.source.index === d.index || p.target.index === d.index ? 1 : 0.2
          })
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('fill', (d: any) => color(String(d.index)))
        g.selectAll('path.chord')
          .style('opacity', 1)
      })

    // Add labels
    group.append('text')
      .attr('dy', '.35em')
      .attr('transform', (d) => `
        rotate(${(((d.startAngle + d.endAngle) / 2) * 180) / Math.PI - 90})
        translate(${outerRadius + 10})
        ${((d.startAngle + d.endAngle) / 2) > Math.PI ? 'rotate(180)' : ''}
      `)
      .attr('text-anchor', (d) => ((d.startAngle + d.endAngle) / 2) > Math.PI ? 'end' : 'start')
      .text((d) => chordData.labels[d.index])
      .style('font-size', '12px')
      .style('font-weight', '500')

    // Add ribbons (chords connecting groups)
    g.append('g')
      .attr('fill-opacity', 0.67)
      .selectAll('path')
      .data(arcs)
      .join('path')
      .attr('class', 'chord')
      .attr('d', (d): string => ribbon(d as any) ?? '')
      .attr('fill', (d) => color(String(d.source.index)))
      .attr('stroke', (d) => d3.rgb(color(String(d.source.index))).darker().formatHex())
      .style('stroke-width', '1px')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 1)
          .style('stroke-width', '2px')
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
        
        tooltip
          .html(`${chordData.labels[d.source.index]} → ${chordData.labels[d.target.index]}: ${d.source.value.toLocaleString()}`)
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
          .attr('fill-opacity', 0.67)
          .style('stroke-width', '1px')
        d3.select('.tooltip').remove()
      })

  }, [nodes, edges, width, height])

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="border border-gray-200 rounded bg-white" />
    </div>
  )
}

