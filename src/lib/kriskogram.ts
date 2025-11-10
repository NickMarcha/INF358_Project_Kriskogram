/**
 * Kriskogram Visualization Implementation
 * 
 * Based on the prototype from README.md, this implements the core Kriskogram
 * visualization using D3.js for rendering network migration data.
 */

import * as d3 from "d3";

// -------------------- Types --------------------

export type Node = {
  id: string;
  label?: string;
  [key: string]: any;
};

export type Edge = {
  source: string;  // Node.id
  target: string;  // Node.id
  value: number;   // positive magnitude
  [key: string]: any;
};

export interface KriskogramAccessors {
  nodeLabel?: (node: Node) => string;
  nodeColor?: (node: Node) => string;
  nodeRadius?: (node: Node) => number;
  nodeShape?: (node: Node) => "circle" | "rect";
  edgeWidth?: (edge: Edge) => number;
  edgeColor?: (edge: Edge, isAbove: boolean) => string;
  nodeOrder?: (node: Node) => string | number;
}

export interface KriskogramConfig {
  nodes: Node[];
  edges: Edge[];
  accessors?: KriskogramAccessors;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  arcOpacity?: number; // Arc transparency (0-1), defaults to 0.85
  container?: string; // CSS selector, defaults to "body"
  title?: string; // Title to display, defaults to "Migration Flow Visualization"
  lens?: { enabled: boolean; x: number; y: number; radius: number };
  legend?:
    | { type: 'direction'; labels?: { above: string; below: string }; colors?: { above: string; below: string } }
    | { type: 'weight'; color: string }
    | { type: 'categorical'; title?: string; entries: Array<{ label: string; color: string }>; interNote?: string };
}

// -------------------- Implementation --------------------

export function createKriskogram(config: KriskogramConfig) {
  const {
    nodes,
    edges,
    accessors = {},
    width = 800,
    height = 400,
    margin = { top: 40, right: 40, bottom: 40, left: 40 },
    arcOpacity = 0.85,
    container = "body",
    title = "Migration Flow Visualization",
  } = config;

  // Clear existing content and remove any orphaned tooltips
  d3.select(container).selectAll("*").remove();
  d3.selectAll(".kriskogram-tooltip").remove();

  // ---- Accessors with defaults ----
  const getNodeLabel = accessors.nodeLabel ?? ((d: Node) => d.label ?? d.id);
  const getNodeColor = accessors.nodeColor ?? (() => "#555");
  const getNodeRadius = accessors.nodeRadius ?? (() => 6);
  const getNodeShape = accessors.nodeShape ?? (() => "circle");
  const getEdgeWidth = accessors.edgeWidth ?? ((d: Edge) => Math.sqrt(d.value));
  const getEdgeColor =
    accessors.edgeColor ??
    ((_d: Edge, isAbove: boolean) => (isAbove ? "#1f77b4" : "#d62728"));
  const getNodeOrder = accessors.nodeOrder ?? ((d: Node) => d.id);

  // ---- Validate edges ----
  const seen = new Set<string>();
  edges.forEach((e) => {
    if (e.value <= 0) {
      console.warn("Edge value must be positive:", e);
    }
    const key = `${e.source}-${e.target}`;
    if (seen.has(key)) {
      console.warn("Duplicate edge detected:", e);
    }
    seen.add(key);
  });

  // ---- Sort nodes ----
  const sortedNodes = [...nodes].sort((a, b) =>
    d3.ascending(getNodeOrder(a), getNodeOrder(b))
  );

  // ---- Setup SVG ----
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("font-family", "sans-serif")
    .style("background", "#fafafa");
  
  // Arrowhead marker for corner direction indicators
  const defs = svg.append("defs");
  defs
    .append("marker")
    .attr("id", "corner-arrow")
    .attr("viewBox", "0 0 12 12")
    .attr("refX", 10)
    .attr("refY", 6)
    .attr("markerWidth", 10)
    .attr("markerHeight", 10)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M 0 0 L 12 6 L 0 12 z")
    .attr("fill", "#6b7280");

  // Create a container group for zoom/pan
  const zoomGroup = svg.append("g").attr("class", "zoom-group");

  const baselineY = height / 2;

  // ---- X Scale ----
  const xScale = d3
    .scalePoint<string>()
    .domain(sortedNodes.map((d) => d.id))
    .range([margin.left, width - margin.right])
    .padding(0.5);

  // ---- Zoom and Pan ----
  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on("zoom", function(event) {
      zoomGroup.attr("transform", event.transform.toString());
    });

  svg.call(zoomBehavior);

  // Create reset button
  const resetButton = svg.append("g")
    .attr("class", "reset-button")
    .style("cursor", "pointer")
    .attr("transform", `translate(${width - 120}, 10)`)
    .on("click", function() {
      svg.transition()
        .duration(750)
        .call(zoomBehavior.transform, d3.zoomIdentity);
    });

  resetButton.append("rect")
    .attr("width", 110)
    .attr("height", 30)
    .attr("rx", 4)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);

  resetButton.append("text")
    .attr("x", 55)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#333")
    .text("Reset View");

  // ---- Baseline ----
  zoomGroup
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", baselineY)
    .attr("y2", baselineY)
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // ---- Arcs (edges) ----
  function arcPath(x1: number, x2: number, isAbove: boolean) {
    const dx = Math.abs(x2 - x1);
    let arcHeight = dx / 2;

    // EdgeLens: amplify arc height if lens is enabled and intersects this span
    if (config.lens && config.lens.enabled) {
      const midX = (x1 + x2) / 2;
      const lens = config.lens;
      const withinX = (midX >= Math.min(x1, x2) && midX <= Math.max(x1, x2));
      const dy = Math.abs(baselineY - lens.y);
      const withinY = dy <= lens.radius;
      if (withinX && withinY) {
        // Increase curvature based on proximity to lens center in X
        const dxCenter = Math.abs(lens.x - midX);
        const influence = Math.max(0, 1 - dxCenter / (lens.radius + 1e-6));
        const factor = 1 + 1.5 * influence; // up to 2.5x
        arcHeight *= factor;
      }
    }

    let sweep: number;
    if (x1 < x2) {
      sweep = isAbove ? 0 : 1;
    } else {
      sweep = isAbove ? 1 : 0;
    }

    return `M${x1},${baselineY} A${dx / 2},${arcHeight} 0 0,${sweep} ${x2},${baselineY}`;
  }

  const edgeGroup = zoomGroup.append("g").attr("class", "edges");

  edgeGroup
    .selectAll("path.arc")
    .data(edges)
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", (d) => {
      const x1 = xScale(d.source)!;
      const x2 = xScale(d.target)!;
      const isAbove = x1 > x2; // flip: rightward = below, leftward = above
      return arcPath(x1, x2, isAbove);
    })
    .attr("fill", "none")
    .attr("stroke", (d) => {
      const x1 = xScale(d.source)!;
      const x2 = xScale(d.target)!;
      const isAbove = x1 > x2;
      return getEdgeColor(d, isAbove);
    })
    .attr("stroke-width", (d) => getEdgeWidth(d))
    .attr("opacity", arcOpacity)
    .style("cursor", "pointer")
    .on("mouseover", function(_event, d) {
      const currentStroke = d3.select(this).attr("stroke");
      
      // Highlight edge on hover with black outline
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke-width", getEdgeWidth(d) * 1.5)
        .style("filter", "drop-shadow(0 0 2px black)")
        .attr("data-original-stroke", currentStroke); // Store original color
      
      // Find source and target nodes for region/division info
      const sourceNode = sortedNodes.find(n => n.id === d.source);
      const targetNode = sortedNodes.find(n => n.id === d.target);
      
      // Check if same region/division
      const sameRegion = sourceNode?.region && targetNode?.region && sourceNode.region === targetNode.region;
      const sameDivision = sourceNode?.division && targetNode?.division && sourceNode.division === targetNode.division;
      
      // Remove any existing tooltips first
      d3.selectAll(".kriskogram-tooltip").remove();
      
      // Show tooltip
      const tooltip = d3.select("body")
        .append("div")
        .attr("class", "kriskogram-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)");
      
      tooltip.html(`
        <strong>${sourceNode?.label || d.source} → ${targetNode?.label || d.target}</strong><br/>
        <strong>Migrants:</strong> ${d.value.toLocaleString()} people<br/>
        ${d.moe ? `<strong>MOE:</strong> ±${d.moe.toLocaleString()}<br/>` : ''}
        ${sourceNode?.region ? `<strong>From Region:</strong> ${sourceNode.region}<br/>` : ''}
        ${targetNode?.region ? `<strong>To Region:</strong> ${targetNode.region}<br/>` : ''}
        ${sourceNode?.division ? `<strong>From Division:</strong> ${sourceNode.division}<br/>` : ''}
        ${targetNode?.division ? `<strong>To Division:</strong> ${targetNode.division}<br/>` : ''}
        <strong>Same Region:</strong> ${sameRegion ? '✓ Yes' : '✗ No'}<br/>
        <strong>Same Division:</strong> ${sameDivision ? '✓ Yes' : '✗ No'}
      `);
    })
    .on("mousemove", function(event) {
      // Select the first tooltip (should only be one) and update position
      const tooltip = d3.select(".kriskogram-tooltip")
      if (!tooltip.empty()) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
      }
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("opacity", arcOpacity)
        .attr("stroke-width", (d: any) => getEdgeWidth(d))
        .style("filter", null);
      
      // Remove all tooltips
      d3.selectAll(".kriskogram-tooltip").remove();
    });

  // ---- Nodes ----
  // 🎨 LABEL POSITIONING GUIDE:
  // Labels are rotated 45° upward-right for better readability
  // To adjust label position, look for ".attr("y", r + 10)" and ".attr("x", r + 5)"
  // - y value: INCREASE to move DOWN, DECREASE to move UP
  // - x value: INCREASE to move RIGHT, DECREASE to move LEFT
  // - Current: y = r + 10, x = r + 5 (balanced position)
  const nodeGroup = zoomGroup.append("g").attr("class", "nodes");

const enhanceNodeSelection = nodeGroup
  .selectAll("g.node")
  .data(sortedNodes)
  .enter()
  .append("g")
  .attr("class", "node")
  .attr("transform", (d) => `translate(${xScale(d.id)},${baselineY})`)
  .style("cursor", "pointer");

enhanceNodeSelection
  .on("mouseover", function(event, d) {
    d3.selectAll(".kriskogram-tooltip").remove();

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "kriskogram-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)");

  const visibleIncoming = (d as any)?.total_incoming_visible ?? (d as any)?._totalIncoming ?? 0;
  const visibleOutgoing = (d as any)?.total_outgoing_visible ?? (d as any)?._totalOutgoing ?? 0;
  const yearIncoming = (d as any)?.total_incoming_year ?? visibleIncoming;
  const yearOutgoing = (d as any)?.total_outgoing_year ?? visibleOutgoing;

    tooltip.html(`
      <strong>${d.label || d.id}</strong><br/>
      ${d.region ? `<strong>Region:</strong> ${d.region}<br/>` : ''}
      ${d.division ? `<strong>Division:</strong> ${d.division}<br/>` : ''}
      ${(d as any)?.population ? `<strong>Population:</strong> ${(d as any).population.toLocaleString()}<br/>` : ''}
      ${(d as any)?.economic_index != null ? `<strong>Economic Index:</strong> ${(d as any).economic_index}<br/>` : ''}
    <strong>Total Incoming (year):</strong> ${yearIncoming.toLocaleString()}<br/>
    <strong>Total Outgoing (year):</strong> ${yearOutgoing.toLocaleString()}<br/>
    <strong>* Visible Incoming:</strong> ${visibleIncoming.toLocaleString()}<br/>
    <strong>* Visible Outgoing:</strong> ${visibleOutgoing.toLocaleString()}<br/>
    <span style="display:block;margin-top:6px;font-size:10px;color:#9ca3af;">* Calculated from currently visible flows</span>
    `);

    tooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  })
  .on("mousemove", function(event) {
    const tooltip = d3.select(".kriskogram-tooltip");
    if (!tooltip.empty()) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    }
  })
  .on("mouseout", function() {
    d3.selectAll(".kriskogram-tooltip").remove();
  })
  .on("click", function(_event, d) {
    edges.filter(e => e.source === d.id || e.target === d.id);

    edgeGroup.selectAll("path.arc")
      .attr("opacity", 0.3);

    edgeGroup.selectAll("path.arc")
      .filter((edge: any) => edge.source === d.id || edge.target === d.id)
      .attr("opacity", 1)
      .attr("stroke-width", (edge: any) => getEdgeWidth(edge) * 1.5);

    setTimeout(() => {
      edgeGroup.selectAll("path.arc")
        .attr("opacity", arcOpacity)
        .attr("stroke-width", (edge: any) => getEdgeWidth(edge));
    }, 2000);
  });

enhanceNodeSelection.each(function (d) {
      const g = d3.select(this);
      const shape = getNodeShape(d);
      const r = getNodeRadius(d);
      const fill = getNodeColor(d);

      if (shape === "circle") {
        g.append("circle")
          .attr("r", r)
          .attr("fill", fill)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      } else if (shape === "rect") {
        g.append("rect")
          .attr("x", -r)
          .attr("y", -r)
          .attr("width", 2 * r)
          .attr("height", 2 * r)
          .attr("fill", fill)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      }

      // Label positioning: adjust these values to fine-tune label placement
      // y: vertical offset - INCREASE to move DOWN, DECREASE to move UP
      // x: horizontal offset - INCREASE to move RIGHT, DECREASE to move LEFT
      // Current: y = r + 10, x = r + 5 (balanced position for 45° rotation)
      // rotate(45): labels slant upward-right for better readability
      g.append("text")
        .attr("y", r + 10)  // <- ADJUST for vertical position (current: r + 10)
        .attr("x", r + 5)   // <- ADJUST for horizontal position (current: r + 5)
        .attr("text-anchor", "start")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .attr("transform", `rotate(45)`)
        .text(getNodeLabel(d));
    });

  // Add title (not affected by zoom)
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text(title);

  // Initial legend render
  renderLegend();

  // Corner direction indicators (clockwise quarter-arc arrows)
  const arrowColor = "#6b7280"; // Tailwind gray-500
  const arrowStroke = 1.5;
  // Scale arrow size with chart size; slightly longer and less curvy
  const base = Math.min(width, height);
  const s = Math.max(14, Math.min(72, base * 0.06)); // segment length from edges
  const r = s * 1.6; // larger radius => less curvy
  const o = s * 1.1; // extend a bit further than s

  // Top-left: arc from (left, top+o) to (left+o, top)
  svg.append("path")
    .attr("d", `M ${margin.left} ${margin.top + o} A ${r} ${r} 0 0 1 ${margin.left + o} ${margin.top}`)
    .attr("fill", "none")
    .attr("stroke", arrowColor)
    .attr("stroke-width", arrowStroke)
    .attr("marker-end", "url(#corner-arrow)");
  // Top-right: arc from (right-o, top) to (right, top+o)
  svg.append("path")
    .attr("d", `M ${width - margin.right - o} ${margin.top} A ${r} ${r} 0 0 1 ${width - margin.right} ${margin.top + o}`)
    .attr("fill", "none")
    .attr("stroke", arrowColor)
    .attr("stroke-width", arrowStroke)
    .attr("marker-end", "url(#corner-arrow)");
  // Bottom-right: arc from (right, bottom-o) to (right-o, bottom)
  svg.append("path")
    .attr("d", `M ${width - margin.right} ${height - margin.bottom - o} A ${r} ${r} 0 0 1 ${width - margin.right - o} ${height - margin.bottom}`)
    .attr("fill", "none")
    .attr("stroke", arrowColor)
    .attr("stroke-width", arrowStroke)
    .attr("marker-end", "url(#corner-arrow)");
  // Bottom-left: arc from (left+o, bottom) to (left, bottom-o)
  svg.append("path")
    .attr("d", `M ${margin.left + o} ${height - margin.bottom} A ${r} ${r} 0 0 1 ${margin.left} ${height - margin.bottom - o}`)
    .attr("fill", "none")
    .attr("stroke", arrowColor)
    .attr("stroke-width", arrowStroke)
    .attr("marker-end", "url(#corner-arrow)");

  // ---- Legend (fixed, not zoomed) ----
  function renderLegend() {
    svg.selectAll('.kris-legend').remove();
    if (!config.legend) return;

    const lg = svg.append('g').attr('class', 'kris-legend');
    const padding = 8;
    const x0 = margin.left;
    const y0 = margin.top + 10;
    let w = 0;
    let h = 0;

    if ((config.legend as any).type === 'direction') {
      const { labels, colors } = (config.legend as any);
      const above = labels?.above ?? 'Above (→)';
      const below = labels?.below ?? 'Below (←)';
      // Default colors aligned with current arc coloring
      const cAbove = colors?.above ?? '#d62728';
      const cBelow = colors?.below ?? '#1f77b4';
      const group = lg.append('g').attr('transform', `translate(${x0 + padding}, ${y0 + padding})`);
      const row = (y: number, label: string, color: string) => {
        group.append('line').attr('x1', 0).attr('y1', y).attr('x2', 28).attr('y2', y).attr('stroke', color).attr('stroke-width', 3);
        group.append('text').attr('x', 36).attr('y', y + 4).attr('fill', '#333').attr('font-size', 11).text(label);
      };
      row(0, above, cAbove);
      row(18, below, cBelow);
      w = 36 + Math.max(above.length, below.length) * 6.5;
      h = 18 + 18;
    } else if ((config.legend as any).type === 'weight') {
      const color = (config.legend as any).color as string;
      const group = lg.append('g').attr('transform', `translate(${x0 + padding}, ${y0 + padding})`);
      const gradId = `lg-grad-${Math.random().toString(36).slice(2)}`;
      const defs2 = svg.append('defs');
      const grad = defs2.append('linearGradient').attr('id', gradId);
      grad.append('stop').attr('offset', '0%').attr('stop-color', `hsla(200, 70%, 80%, 1)`);
      grad.append('stop').attr('offset', '100%').attr('stop-color', `hsla(200, 70%, 30%, 1)`);
      group.append('rect').attr('x', 0).attr('y', 0).attr('width', 120).attr('height', 10).attr('fill', `url(#${gradId})`).attr('stroke', '#ccc');
      group.append('text').attr('x', 0).attr('y', 24).attr('fill', '#333').attr('font-size', 11).text('Lower');
      group.append('text').attr('x', 120).attr('y', 24).attr('text-anchor', 'end').attr('fill', '#333').attr('font-size', 11).text('Higher');
      w = 120;
      h = 30;
    } else if ((config.legend as any).type === 'categorical') {
      const { entries, title, interNote } = (config.legend as any);
      const group = lg.append('g').attr('transform', `translate(${x0 + padding}, ${y0 + padding})`);
      if (title) group.append('text').attr('x', 0).attr('y', 0).attr('fill', '#333').attr('font-size', 12).attr('font-weight', 600).text(title);
      let y = title ? 16 : 0;
      entries.slice(0, 10).forEach((e: any) => {
        group.append('rect').attr('x', 0).attr('y', y).attr('width', 16).attr('height', 8).attr('fill', e.color).attr('stroke', '#ccc');
        group.append('text').attr('x', 22).attr('y', y + 8).attr('fill', '#333').attr('font-size', 11).text(String(e.label));
        y += 14;
      });
      if (interNote) {
        group.append('text').attr('x', 0).attr('y', y + 10).attr('fill', '#666').attr('font-size', 10).text(interNote);
        y += 18;
      }
      w = 160;
      h = y;
    }

    // Background
    lg.insert('rect', ':first-child')
      .attr('x', x0)
      .attr('y', y0)
      .attr('width', w + padding * 2)
      .attr('height', h + padding * 2)
      .attr('fill', 'white')
      .attr('stroke', '#e5e7eb')
      .attr('rx', 6);
  }

  return {
    svg,
    setLens: (lens: { enabled: boolean; x: number; y: number; radius: number }) => {
      (config as any).lens = lens;
      // Recompute paths with new lens
      edgeGroup.selectAll("path.arc").attr("d", (d: any) => {
        const x1 = xScale(d.source)!;
        const x2 = xScale(d.target)!;
        const isAbove = x1 > x2;
        return arcPath(x1, x2, isAbove);
      });
    },
    updateData: (newNodes: Node[], newEdges: Edge[]) => {
      // Remove any existing tooltips before updating
      d3.selectAll(".kriskogram-tooltip").remove();
      
      // Update function for animation
      const newSortedNodes = [...newNodes].sort((a, b) =>
        d3.ascending(getNodeOrder(a), getNodeOrder(b))
      );
      
      // Update x scale
      xScale.domain(newSortedNodes.map((d) => d.id));
      
      // Update nodes
      const nodeUpdate = nodeGroup
        .selectAll("g.node")
        .data(newSortedNodes, (d: any) => d.id);
      
      // Remove old nodes
      nodeUpdate.exit().remove();
      
      // Add new nodes
      const nodeEnter = nodeUpdate.enter()
        .append("g")
        .attr("class", "node")
        .style("cursor", "pointer");
      
      nodeEnter.append("circle")
        .attr("r", 0)
        .attr("fill", (d) => getNodeColor(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
      
      // Label positioning for dynamically added nodes (same as above)
      nodeEnter.append("text")
        .attr("y", 15)  // <- ADJUST THIS VALUE to match above (approximately r + 10, where r ~= 5)
        .attr("x", 10)  // <- ADJUST THIS VALUE for horizontal offset
        .attr("text-anchor", "start")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .attr("transform", `rotate(45)`)
        .text(getNodeLabel);
      
      // Update existing nodes
      const nodeMerge = nodeEnter.merge(nodeUpdate as any);
      
      nodeMerge.transition()
        .duration(750)
        .attr("transform", (d) => `translate(${xScale(d.id)},${baselineY})`);
      
      nodeMerge.select("circle")
        .transition()
        .duration(750)
        .attr("r", (d) => getNodeRadius(d))
        .attr("fill", (d) => getNodeColor(d));
      
      // Update edges
      const edgeUpdate = edgeGroup
        .selectAll("path.arc")
        .data(newEdges, (d: any) => `${d.source}-${d.target}`);
      
      edgeUpdate.exit().remove();
      
      const edgeEnter = edgeUpdate.enter()
        .append("path")
        .attr("class", "arc")
        .attr("fill", "none")
        .attr("opacity", 0)
        .style("cursor", "pointer")
        .on("mouseover", function(_event, d) {
          const currentStroke = d3.select(this).attr("stroke");
          
          // Highlight edge on hover with black outline
          d3.select(this)
            .attr("opacity", 1)
            .attr("stroke-width", getEdgeWidth(d) * 1.5)
            .style("filter", "drop-shadow(0 0 2px black)")
            .attr("data-original-stroke", currentStroke);
          
          // Find source and target nodes
          const sourceNode = newSortedNodes.find(n => n.id === d.source);
          const targetNode = newSortedNodes.find(n => n.id === d.target);
          
          // Check if same region/division
          const sameRegion = sourceNode?.region && targetNode?.region && sourceNode.region === targetNode.region;
          const sameDivision = sourceNode?.division && targetNode?.division && sourceNode.division === targetNode.division;
          
          // Remove any existing tooltips first
          d3.selectAll(".kriskogram-tooltip").remove();
          
          // Show tooltip
          const tooltip = d3.select("body")
            .append("div")
            .attr("class", "kriskogram-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.9)")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)");
          
          tooltip.html(`
            <strong>${sourceNode?.label || d.source} → ${targetNode?.label || d.target}</strong><br/>
            <strong>Migrants:</strong> ${d.value.toLocaleString()} people<br/>
            ${d.moe ? `<strong>MOE:</strong> ±${d.moe.toLocaleString()}<br/>` : ''}
            ${sourceNode?.region ? `<strong>From Region:</strong> ${sourceNode.region}<br/>` : ''}
            ${targetNode?.region ? `<strong>To Region:</strong> ${targetNode.region}<br/>` : ''}
            ${sourceNode?.division ? `<strong>From Division:</strong> ${sourceNode.division}<br/>` : ''}
            ${targetNode?.division ? `<strong>To Division:</strong> ${targetNode.division}<br/>` : ''}
            <strong>Same Region:</strong> ${sameRegion ? '✓ Yes' : '✗ No'}<br/>
            <strong>Same Division:</strong> ${sameDivision ? '✓ Yes' : '✗ No'}
          `);
        })
        .on("mousemove", function(event) {
          // Select the first tooltip (should only be one) and update position
          const tooltip = d3.select(".kriskogram-tooltip")
          if (!tooltip.empty()) {
            tooltip
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px")
          }
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("opacity", arcOpacity)
            .attr("stroke-width", (d: any) => getEdgeWidth(d))
            .style("filter", null);
          
          // Remove all tooltips
          d3.selectAll(".kriskogram-tooltip").remove();
        });
      
      const edgeMerge = edgeEnter.merge(edgeUpdate as any);
      
      edgeMerge.transition()
        .duration(750)
        .attr("d", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 > x2;
          return arcPath(x1, x2, isAbove);
        })
        .attr("stroke", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 > x2;
          return getEdgeColor(d, isAbove);
        })
        .attr("stroke-width", (d) => getEdgeWidth(d))
        .attr("opacity", arcOpacity);

      // Re-render legend when data/props change
      renderLegend();
    }
  };
}

// -------------------- Example Usage --------------------

export function createSampleKriskogram() {
  const nodes: Node[] = [
    { id: "A", label: "Alpha" },
    { id: "B", label: "Beta" },
    { id: "C", label: "Gamma" },
    { id: "D", label: "Delta" },
  ];

  const edges: Edge[] = [
    { source: "A", target: "B", value: 10 },
    { source: "B", target: "D", value: 6 },
    { source: "C", target: "A", value: 4 },
    { source: "D", target: "C", value: 8 },
  ];

  return createKriskogram({
    nodes,
    edges,
    accessors: {
      nodeOrder: (d) => d.id, // alphabetical order
      nodeColor: (d) => (d.id === "A" ? "orange" : "#555"),
      nodeRadius: (d) => (d.id === "B" ? 10 : 6),
      edgeWidth: (e) => e.value / 2,
      edgeColor: (_e, isAbove) => (isAbove ? "steelblue" : "tomato"),
    },
  });
}
