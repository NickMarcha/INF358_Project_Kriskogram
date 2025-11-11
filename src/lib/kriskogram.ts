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

type LegendDirectionItem = {
  type: 'direction';
  labels?: { above?: string; below?: string };
  colors?: { above?: string; below?: string };
};

type LegendWeightItem = {
  type: 'weight';
  color: string;
  scale?: 'linear' | 'sqrt' | 'log';
  min?: number;
  max?: number;
  samples?: Array<{ value: number; color: string; width: number; fraction?: number }>;
};

type LegendEdgeWidthItem = {
  type: 'edgeWidth';
  min?: number;
  max?: number;
  samples?: Array<{ value: number; width: number }>;
};

type LegendNodeSizeItem = {
  type: 'nodeSize';
  entries: Array<{ label: string; radius: number }>;
};

type LegendTemporalOverlayItem = {
  type: 'temporalOverlay';
  entries: Array<{ label: string; color: string }>;
};

type LegendEgoStepsItem = {
  type: 'egoSteps';
  entries: Array<{ step: number; color: string }>;
};

type LegendCategoricalItem = {
  type: 'categorical';
  title?: string;
  entries: Array<{ label: string; color: string }>;
  interNote?: string;
};

type LegendItem =
  | LegendDirectionItem
  | LegendWeightItem
  | LegendEdgeWidthItem
  | LegendNodeSizeItem
  | LegendTemporalOverlayItem
  | LegendEgoStepsItem
  | LegendCategoricalItem;

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
  legend?: LegendItem | LegendItem[];
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
          if (d.__isOverlay) {
            const shrinkFactor = style === 'segmented' ? 0.65 : 0.7;
            return Math.max(0.5, baseWidth * shrinkFactor);
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
        if (d && d.__isOverlay) {
          const target = Math.max(0.2, arcOpacity * 0.45);
          return target;
        }
        return arcOpacity;
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
      const baseDuration = Math.max(1500, step * 120);
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

    const legends = Array.isArray(config.legend) ? config.legend : [config.legend];
    if (legends.length === 0) return;

    type RenderResult = { width: number; height: number };
    const itemSpacing = 12;
    const container = svg.append('g').attr('class', 'kris-legend');
    const x0 = margin.left;
    const y0 = margin.top + 10;
    let currentY = y0;
    let maxWidth = 0;
    const sizes: RenderResult[] = [];

    legends.forEach((item) => {
      const itemGroup = container.append('g');
      const { width, height } = renderLegendItem(itemGroup, item);
      itemGroup.attr('transform', `translate(${x0}, ${currentY})`);
      currentY += height + itemSpacing;
      maxWidth = Math.max(maxWidth, width);
      sizes.push({ width, height });
    });

    const totalHeight =
      sizes.reduce((acc, { height }) => acc + height, 0) + itemSpacing * Math.max(sizes.length - 1, 0);

    container
      .insert('rect', ':first-child')
      .attr('x', x0 - 10)
      .attr('y', y0 - 10)
      .attr('width', maxWidth + 20)
      .attr('height', totalHeight + 20)
      .attr('fill', 'white')
      .attr('stroke', '#e5e7eb')
      .attr('rx', 8)
      .attr('ry', 8);
  }

  function renderLegendItem(group: d3.Selection<SVGGElement, unknown, any, any>, legendItem: LegendItem) {
    const padding = 10;
    const content = group.append('g').attr('transform', `translate(${padding}, ${padding})`);
    let width = 0;
    let height = 0;

    const textWidth = (text: string, fontWeight = false) => text.length * (fontWeight ? 6.8 : 6.2);

    switch (legendItem.type) {
      case 'direction': {
        const labels = legendItem.labels ?? {};
        const colors = legendItem.colors ?? {};
        const above = labels.above ?? 'Above (→)';
        const below = labels.below ?? 'Below (←)';
        const cAbove = colors.above ?? '#d62728';
        const cBelow = colors.below ?? '#1f77b4';
        let y = 0;
        const title = 'flow direction ⟳';
        content
          .append('text')
          .attr('x', 0)
          .attr('y', y)
          .attr('fill', '#111827')
          .attr('font-size', 12)
          .attr('font-weight', 700)
          .text(title);
        y += 18;
        const row = (label: string, color: string) => {
          content
            .append('line')
            .attr('x1', 0)
            .attr('y1', y - 4)
            .attr('x2', 28)
            .attr('y2', y - 4)
            .attr('stroke', color)
            .attr('stroke-width', 3);
          content
            .append('text')
            .attr('x', 36)
            .attr('y', y)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(label);
          y += 18;
        };
        row(above, cAbove);
        row(below, cBelow);
        width = Math.max(textWidth(title, true), textWidth(above) + 36, textWidth(below) + 36);
        height = y;
        break;
      }
      case 'weight': {
        const formatValue = (value?: number) => {
          if (value === undefined || !Number.isFinite(value)) return '—';
          return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
        };
        const scaleLabel =
          legendItem.scale === 'sqrt'
            ? 'Scale: square root'
            : legendItem.scale === 'log'
              ? 'Scale: logarithmic'
              : 'Scale: linear';
        let cursorY = 0;
        content
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#333')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .text('Edge weight intensity');
        cursorY += 16;
        content
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#4b5563')
          .attr('font-size', 10)
          .text(scaleLabel);
        cursorY += 14;
        if (legendItem.min !== undefined && legendItem.max !== undefined) {
          content
            .append('text')
            .attr('x', 0)
            .attr('y', cursorY)
            .attr('fill', '#4b5563')
            .attr('font-size', 10)
            .text(`Range: ${formatValue(legendItem.min)} → ${formatValue(legendItem.max)}`);
          cursorY += 16;
        }
        const samples =
          Array.isArray(legendItem.samples) && legendItem.samples.length > 0
            ? legendItem.samples
            : [
                { value: legendItem.min ?? 0, color: legendItem.color, width: 2, fraction: 0 },
                { value: legendItem.max ?? 0, color: legendItem.color, width: 8, fraction: 1 },
              ];
        let maxLabelWidth = 0;
        samples.forEach((sample) => {
          const fractionLabel = sample.fraction !== undefined ? ` (${Math.round(sample.fraction * 100)}%)` : '';
          const labelText = `${formatValue(sample.value)}${fractionLabel}`;
          const lineY = cursorY + 4;
          content
            .append('line')
            .attr('x1', 0)
            .attr('y1', lineY)
            .attr('x2', 64)
            .attr('y2', lineY)
            .attr('stroke', sample.color ?? legendItem.color)
            .attr('stroke-width', Math.max(1.5, sample.width ?? 2))
            .attr('stroke-linecap', 'round');
          content
            .append('text')
            .attr('x', 72)
            .attr('y', cursorY + 8)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(labelText);
          maxLabelWidth = Math.max(maxLabelWidth, textWidth(labelText));
          cursorY += 22;
        });
        width = Math.max(textWidth('Edge weight intensity', true), 72 + maxLabelWidth);
        height = cursorY;
        break;
      }
      case 'edgeWidth': {
        const formatValue = (value?: number) => {
          if (value === undefined || !Number.isFinite(value)) return '—';
          return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
        };
        let cursorY = 0;
        content
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#333')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .text('Edge width');
        cursorY += 16;
        const samples =
          Array.isArray(legendItem.samples) && legendItem.samples.length > 0
            ? legendItem.samples
            : [
                { value: legendItem.min ?? 0, width: 2 },
                { value: legendItem.max ?? ((legendItem.min ?? 0) + 1), width: 6 },
              ];
        let maxLabelWidth = 0;
        samples.forEach((sample) => {
          const y = cursorY + sample.width / 2;
          content
            .append('line')
            .attr('x1', 0)
            .attr('y1', y)
            .attr('x2', 60)
            .attr('y2', y)
            .attr('stroke', '#4b5563')
            .attr('stroke-width', Math.max(1.5, sample.width))
            .attr('stroke-linecap', 'round');
          const labelText = formatValue(sample.value);
          content
            .append('text')
            .attr('x', 68)
            .attr('y', cursorY + 6)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(labelText);
          maxLabelWidth = Math.max(maxLabelWidth, textWidth(labelText));
          cursorY += Math.max(20, sample.width + 8);
        });
        width = Math.max(textWidth('Edge width', true), 68 + maxLabelWidth);
        height = cursorY;
        break;
      }
      case 'nodeSize': {
        let cursorY = 0;
        content
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#333')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .text('Node size');
        cursorY += 16;
        let maxLabelWidth = 0;
        legendItem.entries.forEach((entry) => {
          const circleY = cursorY + entry.radius;
          content
            .append('circle')
            .attr('cx', entry.radius)
            .attr('cy', circleY)
            .attr('r', entry.radius)
            .attr('fill', '#9ca3af')
            .attr('stroke', '#4b5563');
          content
            .append('text')
            .attr('x', entry.radius * 2 + 8)
            .attr('y', circleY + 4)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(entry.label);
          maxLabelWidth = Math.max(maxLabelWidth, textWidth(entry.label));
          cursorY += entry.radius * 2 + 12;
        });
        width = Math.max(textWidth('Node size', true), legendItem.entries.reduce((acc, entry) => Math.max(acc, entry.radius * 2 + 8 + textWidth(entry.label)), 0));
        height = cursorY;
        break;
      }
      case 'temporalOverlay': {
        let cursorY = 0;
        content
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#333')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .text('Temporal overlay');
        cursorY += 16;
        let maxLabelWidth = 0;
        legendItem.entries.forEach(({ label, color }) => {
          content
            .append('line')
            .attr('x1', 0)
            .attr('y1', cursorY + 4)
            .attr('x2', 36)
            .attr('y2', cursorY + 4)
            .attr('stroke', color)
            .attr('stroke-width', 5)
            .attr('stroke-linecap', 'round');
          content
            .append('text')
            .attr('x', 44)
            .attr('y', cursorY + 8)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(label);
          maxLabelWidth = Math.max(maxLabelWidth, textWidth(label));
          cursorY += 20;
        });
        width = Math.max(textWidth('Temporal overlay', true), 44 + maxLabelWidth);
        height = cursorY;
        break;
      }
      case 'egoSteps': {
        let cursorY = 0;
        content
          .append('text')
          .attr('x', 0)
          .attr('y', cursorY)
          .attr('fill', '#333')
          .attr('font-size', 12)
          .attr('font-weight', 600)
          .text('Ego neighbor steps');
        cursorY += 16;
        let maxLabelWidth = 0;
        legendItem.entries.forEach(({ step, color }) => {
          const label = step === 1 ? 'Step 1 (direct neighbors)' : `Step ${step}`;
          content
            .append('line')
            .attr('x1', 0)
            .attr('y1', cursorY + 4)
            .attr('x2', 36)
            .attr('y2', cursorY + 4)
            .attr('stroke', color)
            .attr('stroke-width', 5)
            .attr('stroke-linecap', 'round');
          content
            .append('text')
            .attr('x', 44)
            .attr('y', cursorY + 8)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(label);
          maxLabelWidth = Math.max(maxLabelWidth, textWidth(label));
          cursorY += 18;
        });
        width = Math.max(textWidth('Ego neighbor steps', true), 44 + maxLabelWidth);
        height = cursorY;
        break;
      }
      case 'categorical': {
        let cursorY = 0;
        if (legendItem.title) {
          content
            .append('text')
            .attr('x', 0)
            .attr('y', cursorY)
            .attr('fill', '#333')
            .attr('font-size', 12)
            .attr('font-weight', 600)
            .text(legendItem.title);
          cursorY += 16;
        }
        legendItem.entries.slice(0, 10).forEach((entry) => {
          content
            .append('rect')
            .attr('x', 0)
            .attr('y', cursorY)
            .attr('width', 16)
            .attr('height', 8)
            .attr('fill', entry.color)
            .attr('stroke', '#ccc');
          content
            .append('text')
            .attr('x', 22)
            .attr('y', cursorY + 8)
            .attr('fill', '#333')
            .attr('font-size', 11)
            .text(String(entry.label));
          cursorY += 14;
        });
        if (legendItem.interNote) {
          content
            .append('text')
            .attr('x', 0)
            .attr('y', cursorY + 10)
            .attr('fill', '#666')
            .attr('font-size', 10)
            .text(legendItem.interNote);
          cursorY += 18;
        }
        width = Math.max(
          legendItem.entries.reduce((acc, entry) => Math.max(acc, 22 + textWidth(String(entry.label))), 0),
          legendItem.title ? textWidth(legendItem.title, true) : 0,
        );
        width = Math.max(width, 120);
        height = cursorY;
        break;
      }
    }

    return { width: width + padding * 2, height: height + padding * 2 };
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
