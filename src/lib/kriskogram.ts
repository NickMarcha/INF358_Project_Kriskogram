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
  nodeStroke?: (node: Node) => { color: string; width?: number; dashArray?: string };
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
    | {
        type: 'weight';
        color: string;
        scale?: 'linear' | 'sqrt' | 'log';
        min?: number;
        max?: number;
        samples?: Array<{ value: number; color: string; width: number; fraction?: number }>;
      }
    | { type: 'temporalOverlay'; entries: Array<{ label: string; color: string }> }
    | { type: 'egoSteps'; entries: Array<{ step: number; color: string }> }
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

  const containerSelection = d3.select(container);

  // Clear existing content and remove any orphaned tooltips
  containerSelection.selectAll("*").remove();
  d3.selectAll(".kriskogram-tooltip").remove();

  // ---- Accessors with defaults ----
  const getNodeLabel = accessors.nodeLabel ?? ((d: Node) => d.label ?? d.id);
  const getNodeColor = accessors.nodeColor ?? (() => "#555");
  const getNodeRadius = accessors.nodeRadius ?? (() => 6);
  const getNodeShape = accessors.nodeShape ?? (() => "circle");
  const getNodeStroke = accessors.nodeStroke ?? (() => ({ color: '#fff', width: 2 }));
  const resolveNodeStroke = (node: Node) => {
    const stroke = getNodeStroke(node) as { color: string; width?: number; dashArray?: string };
    return {
      color: stroke.color,
      width: stroke.width ?? 2,
      dashArray: stroke.dashArray ?? null,
    };
  };
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
    const yearSegment = (e as any)?.__displayYear ?? 'current';
    const key = `${e.source}-${e.target}-${yearSegment}`;
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
  const svg = containerSelection
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
  function arcPath(x1: number, x2: number, isAbove: boolean, initialGap = 0) {
    const span = Math.max(Math.abs(x2 - x1), 1);
    const gap = Math.max(0, Math.min(initialGap, span / 2));
    const startY = baselineY + (isAbove ? gap : -gap);
    const endY = startY;
    let arcHeight = span / 2;

    // EdgeLens: amplify arc height if lens is enabled and intersects this span
    if (config.lens && config.lens.enabled) {
      const midX = (x1 + x2) / 2;
      const lens = config.lens;
      const withinX = (midX >= Math.min(x1, x2) && midX <= Math.max(x1, x2));
      const dy = Math.abs(startY - lens.y);
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

    const radius = Math.max(span / 2, 1);

    return `M${x1},${startY} A${radius},${arcHeight} 0 0,${sweep} ${x2},${endY}`;
  }

  const edgeGroup = zoomGroup.append("g").attr("class", "edges");
  const edgeOutlineGroup = zoomGroup.append("g").attr("class", "edges-outline");

  const edgeSelection = (edgeGroup
    .selectAll<SVGPathElement, any>("path.arc")
    .data(edges, (d: any) => `${d.source}-${d.target}-${(d && d.__displayYear) ?? 'current'}`)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "arc")
          .attr("fill", "none")
          .style("cursor", "pointer"),
      (update) => update,
      (exit) => exit.remove(),
    )) as d3.Selection<SVGPathElement, any, SVGGElement, unknown>;

  const outlineSelection = (edgeOutlineGroup
    .selectAll<SVGPathElement, any>("path.arc-outline")
    .data(edges, (d: any) => `${d.source}-${d.target}-${(d && d.__displayYear) ?? 'current'}`)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "arc-outline")
          .attr("fill", "none"),
      (update) => update,
      (exit) => exit.remove(),
    )) as d3.Selection<SVGPathElement, any, SVGGElement, unknown>;

  outlineSelection.style("pointer-events", "none");

  let backgroundStroke = '#f8fafc';
  if (typeof window !== 'undefined') {
    const containerNode = containerSelection.node() as HTMLElement | null;
    const computedBg = containerNode ? window.getComputedStyle(containerNode).backgroundColor : null;
    if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)') {
      backgroundStroke = computedBg;
    }
  }

  const applyEdgeGeometry = (selection: d3.Selection<SVGPathElement, any, SVGGElement, unknown>, forOutline = false) => {
    selection
      .attr("d", (d: any) => {
        const x1 = xScale(d.source)!;
        const x2 = xScale(d.target)!;
        const isAbove = x1 > x2;
        d.__isAbove = isAbove;
        if ((d.__overlayStyle ?? 'filled') === 'segmented') {
          if (typeof d.__segmentDirection !== 'number' || d.__segmentDirection === 0) {
            d.__segmentDirection = 1;
          }
        }
        const initialGap =
          typeof d.__segmentInitialGap === 'number'
            ? d.__segmentInitialGap
            : typeof d.__initialGap === 'number'
              ? d.__initialGap
              : 0;
        return arcPath(x1, x2, isAbove, initialGap);
      })
      .attr("stroke-linejoin", "round")
      .attr("stroke", (d: any) => {
        const x1 = xScale(d.source)!;
        const x2 = xScale(d.target)!;
        const isAbove = x1 > x2;
        return forOutline ? backgroundStroke : getEdgeColor(d, isAbove);
      })
      .attr("stroke-width", (d: any) => {
        const baseWidth = Math.max(getEdgeWidth(d), 0.75);
        const outlineThickness = Math.max(0.5, (d.__outlineGap ?? 3));
        const style = d.__overlayStyle ?? 'filled';
        if (!forOutline) {
          if (style === 'outline') {
            return outlineThickness;
          }
          return baseWidth;
        }
        return 0;
      })
      .attr("stroke-linecap", (d: any) => (d.__overlayStyle === 'segmented' ? d.__overlayLineCap ?? 'round' : 'round'))
      .attr("stroke-dasharray", (d: any) => d.__overlayDash ?? null)
      .attr("stroke-dashoffset", (d: any) => d.__overlayDashOffset ?? 0)
      .attr("opacity", (d: any) => {
        if (forOutline) {
          return 0;
        }
        return d && d.__isOverlay ? Math.max(0.25, arcOpacity * 0.65) : arcOpacity;
      });
  };

  applyEdgeGeometry(edgeSelection, false);
  applyEdgeGeometry(outlineSelection, true);

  const applySegmentAnimation = (selection: d3.Selection<SVGPathElement, any, any, any>) => {
    selection.each(function (d: any) {
      const path = d3.select(this);
      const animate = Boolean(d.__segmentAnimate);
      const cycle = d.__segmentCycle ?? 0;
      const baseOffset = d.__overlayDashOffset ?? 0;
      const direction = d.__segmentDirection ?? -1;
      const baseSpeed = Number(d.__segmentSpeed ?? 1);
      const scaleByWeight = Boolean(d.__segmentScaleByWeight);
      path.interrupt();
      if (!animate || !cycle) {
        path.attr('stroke-dashoffset', baseOffset);
        return;
      }
      const step = cycle;
      const speedMultiplier = Number.isFinite(baseSpeed) && baseSpeed > 0 ? baseSpeed : 1;
      let effectiveSpeed = speedMultiplier;
      if (scaleByWeight) {
        const weightWidth = Math.max(getEdgeWidth(d), 0.5);
        effectiveSpeed *= weightWidth;
      }
      const baseDuration = Math.max(400, step * 120);
      const duration = Math.max(200, baseDuration / effectiveSpeed);
      const start = baseOffset;
      const end = baseOffset + direction * -step;
      const loop = () => {
        path
          .attr('stroke-dashoffset', start)
          .transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', end)
          .on('end', loop);
      };
      loop();
    });
  };

  applySegmentAnimation(edgeSelection);
  applySegmentAnimation(outlineSelection);

  edgeSelection
    .on("mouseover", function (_event, d: any) {
      const currentStroke = d3.select(this).attr("stroke");
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke-width", getEdgeWidth(d) * 1.5)
        .style("filter", "drop-shadow(0 0 2px black)")
        .attr("data-original-stroke", currentStroke);
      const sourceNode = sortedNodes.find((n) => n.id === d.source);
      const targetNode = sortedNodes.find((n) => n.id === d.target);
      const sameRegion = sourceNode?.region && targetNode?.region && sourceNode.region === targetNode.region;
      const sameDivision = sourceNode?.division && targetNode?.division && sourceNode.division === targetNode.division;
      d3.selectAll(".kriskogram-tooltip").remove();
      const tooltip = d3
        .select("body")
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
      const displayYear = d.__displayYear;
      const temporalDelta = d.__temporalDelta ?? 0;
      const temporalLabel = temporalDelta === 0 ? 'Current year' : temporalDelta < 0 ? 'Past overlay' : 'Future overlay';
      tooltip.html(`
        <strong>${sourceNode?.label || d.source} → ${targetNode?.label || d.target}</strong><br/>
        ${displayYear ? `<strong>Year:</strong> ${displayYear} (${temporalLabel})<br/>` : ''}
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
    .on("mousemove", function (event) {
      const tooltip = d3.select(".kriskogram-tooltip");
      if (!tooltip.empty()) {
        tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 10 + "px");
      }
    })
    .on("mouseout", function () {
      const edge = d3.select(this);
      const datum: any = edge.datum();
      edge.style("filter", null);
      applyEdgeGeometry(edge as unknown as d3.Selection<SVGPathElement, any, SVGGElement, unknown>, false);
      applyEdgeGeometry(outlineSelection.filter((outlineDatum: any) => outlineDatum === datum), true);
      applySegmentAnimation(edge as unknown as d3.Selection<SVGPathElement, any, SVGGElement, unknown>);
      applySegmentAnimation(outlineSelection.filter((outlineDatum: any) => outlineDatum === datum));
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

const formatNodeTooltipBlock = (node: any) => {
  const formatNumber = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString() : '0';

  const optionalLine = (label: string, value: any) =>
    value != null && value !== ''
      ? `<div style="margin-bottom:3px;"><strong>${label}</strong> ${typeof value === 'number' ? formatNumber(value) : value}</div>`
      : '';

  const visibleIncoming = node.total_incoming_visible ?? node._totalIncoming ?? 0;
  const visibleOutgoing = node.total_outgoing_visible ?? node._totalOutgoing ?? 0;
  const yearIncoming = node.total_incoming_year ?? visibleIncoming;
  const yearOutgoing = node.total_outgoing_year ?? visibleOutgoing;
  const netVisible = node.net_flow_visible ?? (visibleIncoming - visibleOutgoing);
  const netYear = node.net_flow_year ?? (yearIncoming - yearOutgoing);
  const overlayPast = node._overlayPastTotal ?? node.temporal_overlay_past_total ?? 0;
  const overlayFuture = node._overlayFutureTotal ?? node.temporal_overlay_future_total ?? 0;
  const overlayDelta = node._overlayDelta ?? node.temporal_overlay_delta ?? 0;

  const overlayLines =
    overlayPast || overlayFuture
      ? `
        <div style="margin-top:6px;">
          <div style="margin-bottom:3px;color:#93c5fd;"><strong>Overlay Past Total:</strong> ${formatNumber(overlayPast)}</div>
          <div style="margin-bottom:3px;color:#fca5a5;"><strong>Overlay Future Total:</strong> ${formatNumber(overlayFuture)}</div>
          <div style="color:#fca5a5;"><strong>Overlay Δ (future - past):</strong> ${formatNumber(overlayDelta)}</div>
        </div>
      `
      : '';

  return `
    <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.35);border-radius:6px;padding:10px;">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;">${node.label || node.id}</div>
      ${optionalLine('Region:', node.region)}
      ${optionalLine('Division:', node.division)}
      ${optionalLine('Population:', node.population != null ? node.population : '')}
      ${optionalLine('Economic Index:', node.economic_index != null ? node.economic_index : '')}
      <div style="margin-bottom:3px;"><strong>Total Incoming (year):</strong> ${formatNumber(yearIncoming)}</div>
      <div style="margin-bottom:3px;"><strong>Total Outgoing (year):</strong> ${formatNumber(yearOutgoing)}</div>
      <div style="margin-bottom:3px;"><strong>* Visible Incoming:</strong> ${formatNumber(visibleIncoming)}</div>
      <div style="margin-bottom:3px;"><strong>* Visible Outgoing:</strong> ${formatNumber(visibleOutgoing)}</div>
      <div style="margin-bottom:3px;"><strong>Total Net (year):</strong> ${formatNumber(netYear)}</div>
      <div style="margin-bottom:3px;"><strong>* Visible Net:</strong> ${formatNumber(netVisible)}</div>
      ${overlayLines}
      <div style="margin-top:8px;font-size:10px;color:#94a3b8;">* Calculated from currently visible flows</div>
    </div>
  `;
};

const gatherNodesAtPointer = (event: any, fallback: any) => {
  if (typeof document === "undefined" || !document.elementsFromPoint) {
    return [fallback];
  }
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  const seen = new Set<string>();
  const nodes: any[] = [];
  for (const el of elements) {
    if (!el) continue;
    const group = el.closest && el.closest("g.node");
    if (group) {
      const datum = d3.select(group).datum() as any;
      if (datum && typeof datum.id === "string" && !seen.has(datum.id)) {
        seen.add(datum.id);
        nodes.push(datum);
      }
    }
  }
  if (nodes.length === 0) {
    nodes.push(fallback);
  }
  return nodes;
};

const renderTooltipHtmlForNodes = (nodes: any[]) => {
  return `
    <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;">
      ${nodes.map((node) => formatNodeTooltipBlock(node)).join('')}
    </div>
  `;
};

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

    const nodesForTooltip = gatherNodesAtPointer(event, d);
    tooltip.html(renderTooltipHtmlForNodes(nodesForTooltip));

    tooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  })
  .on("mousemove", function(event) {
    const tooltip = d3.select(".kriskogram-tooltip");
    if (!tooltip.empty()) {
      const nodesForTooltip = gatherNodesAtPointer(event, d3.select(this).datum());
      tooltip.html(renderTooltipHtmlForNodes(nodesForTooltip));
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
      .attr("opacity", (edge: any) => (edge && edge.__isOverlay ? Math.max(0.15, arcOpacity * 0.4) : 0.3));

    edgeGroup.selectAll("path.arc")
      .filter((edge: any) => edge.source === d.id || edge.target === d.id)
      .attr("opacity", 1)
      .attr("stroke-width", (edge: any) => getEdgeWidth(edge) * 1.5);

    setTimeout(() => {
      edgeGroup.selectAll("path.arc")
        .attr("opacity", (edge: any) => (edge && edge.__isOverlay ? Math.max(0.25, arcOpacity * 0.65) : arcOpacity))
        .attr("stroke-width", (edge: any) => getEdgeWidth(edge));
    }, 2000);
  });

enhanceNodeSelection.each(function (d) {
      const g = d3.select(this);
      const shape = getNodeShape(d);
      const r = getNodeRadius(d);
      const fill = getNodeColor(d);
      const stroke = resolveNodeStroke(d);
      const dashArray = stroke.dashArray;

      if (shape === "circle") {
        g.append("circle")
          .attr("r", r)
          .attr("fill", fill)
          .attr("stroke", stroke.color)
          .attr("stroke-width", stroke.width)
          .attr("stroke-dasharray", dashArray);
      } else if (shape === "rect") {
        g.append("rect")
          .attr("x", -r)
          .attr("y", -r)
          .attr("width", 2 * r)
          .attr("height", 2 * r)
          .attr("fill", fill)
          .attr("stroke", stroke.color)
          .attr("stroke-width", stroke.width)
          .attr("stroke-dasharray", dashArray);
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
      const weightLegend = config.legend as {
        color: string;
        scale?: 'linear' | 'sqrt' | 'log';
        min?: number;
        max?: number;
        samples?: Array<{ value: number; color: string; width: number; fraction?: number }>;
      };
      const group = lg.append('g').attr('transform', `translate(${x0 + padding}, ${y0 + padding})`);
      const formatValue = (value?: number) => {
        if (value === undefined || !Number.isFinite(value)) return '—';
        const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
        return formatter.format(value);
      };
      const scaleLabel =
        weightLegend.scale === 'sqrt'
          ? 'Scale: square root'
          : weightLegend.scale === 'log'
            ? 'Scale: logarithmic'
            : 'Scale: linear';
      let cursorY = 0;
      group
        .append('text')
        .attr('x', 0)
        .attr('y', cursorY)
        .attr('fill', '#333')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text('Edge weight intensity');
      cursorY += 16;
      group
        .append('text')
        .attr('x', 0)
        .attr('y', cursorY)
        .attr('fill', '#4b5563')
        .attr('font-size', 10)
        .text(scaleLabel);
      cursorY += 14;
      if (weightLegend.min !== undefined && weightLegend.max !== undefined) {
        group
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#4b5563')
          .attr('font-size', 10)
          .text(`Range: ${formatValue(weightLegend.min)} → ${formatValue(weightLegend.max)}`);
        cursorY += 16;
      }
      const samples =
        Array.isArray(weightLegend.samples) && weightLegend.samples.length > 0
          ? weightLegend.samples
          : [
              { value: weightLegend.min ?? 0, color: weightLegend.color, width: 2, fraction: 0 },
              { value: weightLegend.max ?? 0, color: weightLegend.color, width: 8, fraction: 1 },
            ];
      let maxLabelChars = 0;
      samples.forEach((sample) => {
        const fractionLabel =
          sample.fraction !== undefined ? ` (${Math.round(sample.fraction * 100)}%)` : '';
        const labelText = `${formatValue(sample.value)}${fractionLabel}`;
        const lineY = cursorY + 4;
        group
          .append('line')
          .attr('x1', 0)
          .attr('y1', lineY)
          .attr('x2', 64)
          .attr('y2', lineY)
          .attr('stroke', sample.color ?? weightLegend.color)
          .attr('stroke-width', Math.max(1.5, sample.width ?? 2))
          .attr('stroke-linecap', 'round');
        group
          .append('text')
          .attr('x', 72)
          .attr('y', cursorY + 8)
          .attr('fill', '#333')
          .attr('font-size', 11)
          .text(labelText);
        maxLabelChars = Math.max(maxLabelChars, labelText.length);
        cursorY += 22;
      });
      w = 72 + maxLabelChars * 6.2;
      h = cursorY;
    } else if ((config.legend as any).type === 'temporalOverlay') {
      const overlayLegend = config.legend as { entries: Array<{ label: string; color: string }> };
      const group = lg.append('g').attr('transform', `translate(${x0 + padding}, ${y0 + padding})`);
      let cursorY = 0;
      group
        .append('text')
        .attr('x', 0)
        .attr('y', cursorY)
        .attr('fill', '#333')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text('Temporal overlay');
      cursorY += 16;
      overlayLegend.entries.forEach(({ label, color }) => {
        group
          .append('line')
          .attr('x1', 0)
          .attr('y1', cursorY + 4)
          .attr('x2', 36)
          .attr('y2', cursorY + 4)
          .attr('stroke', color)
          .attr('stroke-width', 5)
          .attr('stroke-linecap', 'round');
        group
          .append('text')
          .attr('x', 44)
          .attr('y', cursorY + 8)
          .attr('fill', '#333')
          .attr('font-size', 11)
          .text(label);
        cursorY += 20;
      });
      const maxLabelChars = overlayLegend.entries.reduce((acc, entry) => Math.max(acc, entry.label.length), 0);
      w = 44 + maxLabelChars * 6.5;
      h = cursorY;
    } else if ((config.legend as any).type === 'egoSteps') {
      const egoLegend = config.legend as { entries: Array<{ step: number; color: string }> };
      const group = lg.append('g').attr('transform', `translate(${x0 + padding}, ${y0 + padding})`);
      let cursorY = 0;
      group
        .append('text')
        .attr('x', 0)
        .attr('y', cursorY)
        .attr('fill', '#333')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .text('Ego neighbor steps');
      cursorY += 16;
      let maxLabelChars = 0;
      egoLegend.entries.forEach(({ step, color }) => {
        const label =
          step === 1 ? 'Step 1 (direct neighbors)' : `Step ${step}`;
        group
          .append('line')
          .attr('x1', 0)
          .attr('y1', cursorY + 4)
          .attr('x2', 36)
          .attr('y2', cursorY + 4)
          .attr('stroke', color)
          .attr('stroke-width', 5)
          .attr('stroke-linecap', 'round');
        group
          .append('text')
          .attr('x', 44)
          .attr('y', cursorY + 8)
          .attr('fill', '#333')
          .attr('font-size', 11)
          .text(label);
        maxLabelChars = Math.max(maxLabelChars, label.length);
        cursorY += 18;
      });
      w = 44 + maxLabelChars * 6.5;
      h = cursorY;
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
        const initialGap =
          typeof d.__segmentInitialGap === 'number'
            ? d.__segmentInitialGap
            : typeof d.__initialGap === 'number'
              ? d.__initialGap
              : 0;
        return arcPath(x1, x2, isAbove, initialGap);
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
        .attr("stroke", (d) => resolveNodeStroke(d).color)
        .attr("stroke-width", (d) => resolveNodeStroke(d).width)
        .attr("stroke-dasharray", (d) => resolveNodeStroke(d).dashArray);
      
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
        .attr("fill", (d) => getNodeColor(d))
        .attr("stroke", (d) => resolveNodeStroke(d).color)
        .attr("stroke-width", (d) => resolveNodeStroke(d).width)
        .attr("stroke-dasharray", (d) => resolveNodeStroke(d).dashArray);
      
      // Update edge outlines first so they stay in sync with primary paths
      const outlineUpdate = edgeOutlineGroup
        .selectAll<SVGPathElement, any>("path.arc-outline")
        .data(newEdges, (d: any) => `${d.source}-${d.target}-${(d && d.__displayYear) ?? 'current'}`);

      outlineUpdate.exit().remove();

      const outlineEnter = outlineUpdate.enter()
        .append("path")
        .attr("class", "arc-outline")
        .attr("fill", "none");

      const outlineMerge = outlineEnter.merge(outlineUpdate as any);
      outlineMerge.style("pointer-events", "none");

      applyEdgeGeometry(outlineMerge as any, true);
      applySegmentAnimation(outlineMerge as any);

      // Update edges
      const edgeUpdate = edgeGroup
        .selectAll("path.arc")
        .data(newEdges, (d: any) => `${d.source}-${d.target}-${(d && d.__displayYear) ?? 'current'}`);
      
      edgeUpdate.exit().remove();
      
      const edgeEnter = edgeUpdate.enter()
        .append("path")
        .attr("class", "arc")
        .attr("fill", "none")
        .attr("opacity", 0)
        .attr("d", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 > x2;
          (d as any).__isAbove = isAbove;
          if (((d as any).__overlayStyle ?? 'filled') === 'segmented') {
            const currentDirection = (d as any).__segmentDirection;
            if (typeof currentDirection !== 'number' || currentDirection === 0) {
              (d as any).__segmentDirection = 1;
            }
          }
          const initialGap =
            typeof (d as any).__segmentInitialGap === 'number'
              ? (d as any).__segmentInitialGap
              : typeof (d as any).__initialGap === 'number'
                ? (d as any).__initialGap
                : 0;
          return arcPath(x1, x2, isAbove, initialGap);
        })
        .attr("stroke", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 > x2;
          return getEdgeColor(d, isAbove);
        })
        .attr("stroke-width", (d) => getEdgeWidth(d))
        .attr("stroke-linecap", (d: any) => ((d as any)?.__overlayLineCap) ?? "round")
        .attr("stroke-dasharray", (d: any) => {
          const dash = (d as any)?.__overlayDash;
          return dash ? dash : null;
        })
        .attr("stroke-dashoffset", (d: any) => (d as any)?.__overlayDashOffset ?? 0)
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
          
          const displayYear = (d as any)?.__displayYear;
          const temporalDelta = (d as any)?.__temporalDelta ?? 0;
          const temporalLabel = temporalDelta === 0 ? 'Current year' : temporalDelta < 0 ? 'Past overlay' : 'Future overlay';

          tooltip.html(`
            <strong>${sourceNode?.label || d.source} → ${targetNode?.label || d.target}</strong><br/>
            ${displayYear ? `<strong>Year:</strong> ${displayYear} (${temporalLabel})<br/>` : ''}
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
            .attr("opacity", (d: any) => (d && d.__isOverlay ? Math.max(0.25, arcOpacity * 0.65) : arcOpacity))
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
          (d as any).__isAbove = isAbove;
          if (((d as any).__overlayStyle ?? 'filled') === 'segmented') {
            const currentDirection = (d as any).__segmentDirection;
            if (typeof currentDirection !== 'number' || currentDirection === 0) {
              (d as any).__segmentDirection = 1;
            }
          }
          const initialGap =
            typeof (d as any).__segmentInitialGap === 'number'
              ? (d as any).__segmentInitialGap
              : typeof (d as any).__initialGap === 'number'
                ? (d as any).__initialGap
                : 0;
          return arcPath(x1, x2, isAbove, initialGap);
        })
        .attr("stroke", (d) => {
          const x1 = xScale(d.source)!;
          const x2 = xScale(d.target)!;
          const isAbove = x1 > x2;
          return getEdgeColor(d, isAbove);
        })
        .attr("stroke-width", (d) => getEdgeWidth(d))
        .attr("stroke-linecap", (d: any) => ((d as any)?.__overlayLineCap) ?? "round")
        .attr("stroke-dasharray", (d: any) => {
          const dash = (d as any)?.__overlayDash;
          return dash ? dash : null;
        })
        .attr("stroke-dashoffset", (d: any) => (d as any)?.__overlayDashOffset ?? 0)
        .attr("opacity", (d: any) => (d && d.__isOverlay ? Math.max(0.25, arcOpacity * 0.65) : arcOpacity))
        .on("end", function(this: SVGPathElement) {
          applySegmentAnimation(d3.select<SVGPathElement, any>(this));
        });

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
