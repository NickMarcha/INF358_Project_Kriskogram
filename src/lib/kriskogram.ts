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
  container?: string; // CSS selector, defaults to "body"
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
    container = "body",
  } = config;

  // Clear existing content
  d3.select(container).selectAll("*").remove();

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
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("font-family", "sans-serif")
    .style("background", "#fafafa");

  const baselineY = height / 2;

  // ---- X Scale ----
  const xScale = d3
    .scalePoint<string>()
    .domain(sortedNodes.map((d) => d.id))
    .range([margin.left, width - margin.right])
    .padding(0.5);

  // ---- Baseline ----
  svg
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
    const arcHeight = dx / 2;

    let sweep: number;
    if (x1 < x2) {
      sweep = isAbove ? 0 : 1;
    } else {
      sweep = isAbove ? 1 : 0;
    }

    return `M${x1},${baselineY} A${dx / 2},${arcHeight} 0 0,${sweep} ${x2},${baselineY}`;
  }

  const edgeGroup = svg.append("g").attr("class", "edges");

  edgeGroup
    .selectAll("path.arc")
    .data(edges)
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", (d) => {
      const x1 = xScale(d.source)!;
      const x2 = xScale(d.target)!;
      const isAbove = x1 < x2; // rightward = above, leftward = below
      return arcPath(x1, x2, isAbove);
    })
    .attr("fill", "none")
    .attr("stroke", (d) => {
      const x1 = xScale(d.source)!;
      const x2 = xScale(d.target)!;
      const isAbove = x1 < x2;
      return getEdgeColor(d, isAbove);
    })
    .attr("stroke-width", (d) => getEdgeWidth(d))
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("mouseover", function(_event, d) {
      // Highlight edge on hover
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke-width", getEdgeWidth(d) * 1.5);
      
      // Show tooltip
      const tooltip = d3.select("body")
        .append("div")
        .attr("class", "kriskogram-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000");
      
      tooltip.html(`
        <strong>${d.source} → ${d.target}</strong><br/>
        Value: ${d.value.toLocaleString()}<br/>
        ${d.migration_type ? `Type: ${d.migration_type}<br/>` : ''}
        ${d.distance_km ? `Distance: ${d.distance_km.toFixed(0)} km` : ''}
      `);
    })
    .on("mousemove", function(event) {
      d3.select(".kriskogram-tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("opacity", 0.85)
        .attr("stroke-width", (d: any) => getEdgeWidth(d));
      
      d3.select(".kriskogram-tooltip").remove();
    });

  // ---- Nodes ----
  const nodeGroup = svg.append("g").attr("class", "nodes");

  nodeGroup
    .selectAll("g.node")
    .data(sortedNodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${xScale(d.id)},${baselineY})`)
    .style("cursor", "pointer")
    .on("click", function(_event, d) {
      // Highlight connected edges
      edges.filter(e => e.source === d.id || e.target === d.id);
      
      edgeGroup.selectAll("path.arc")
        .attr("opacity", 0.3);
      
      edgeGroup.selectAll("path.arc")
        .filter((edge: any) => edge.source === d.id || edge.target === d.id)
        .attr("opacity", 1)
        .attr("stroke-width", (edge: any) => getEdgeWidth(edge) * 1.5);
      
      // Reset after 2 seconds
      setTimeout(() => {
        edgeGroup.selectAll("path.arc")
          .attr("opacity", 0.85)
          .attr("stroke-width", (edge: any) => getEdgeWidth(edge));
      }, 2000);
    })
    .each(function (d) {
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

      g.append("text")
        .attr("y", r + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .text(getNodeLabel(d));
    });

  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text("Migration Flow Visualization");

  return {
    svg,
    updateData: (newNodes: Node[], newEdges: Edge[]) => {
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
      
      nodeEnter.append("text")
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
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
        .attr("opacity", 0);
      
      const edgeMerge = edgeEnter.merge(edgeUpdate as any);
      
      edgeMerge.transition()
        .duration(750)
        .attr("d", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 < x2;
          return arcPath(x1, x2, isAbove);
        })
        .attr("stroke", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 < x2;
          return getEdgeColor(d, isAbove);
        })
        .attr("stroke-width", (d) => getEdgeWidth(d))
        .attr("opacity", 0.85);
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
