
# Kriskogram - Dynamic Interactive Network Visualization

> Exploring dynamic interactive Kriskograms for snapshot-based network data

## Background
Kriskograms are aimed at an expert audience to look out for specific patterns in geospatial data. As far as I can tell, there as not been an extension* on their abstraction since they published in 2013. Their original abstraction was in black & white, and only looked at static migration data. There is opportunity here to try color, animation, or create some basic toolset, maybe an extension to d3js, to create kriskograms regardless of data. This seems very doable with d3 primitives. I could use the original Kriskogram papers data (us-census) to compare the original and extended versions.


Making this interactive, as suggested by the Geospatial STAR, by Link Sliding or the EdgeLens, highlighting individual nodes and their connections also seems doable.

*There is an example of someone extending the Kriskogram for their specific paper Using integrated visualization techniques to investigate associations between cardiovascular health outcomes and residential migration in Auckland, New Zealand

Schottler/Geospatial Star Definitions:

> Lastly, there are techniques focused on navigation: Link sliding snaps the cursor to a link and while dragging the mouse, slides the field-of-view along the link until it reaches the other end of the link. The same paper introduces another technique: Bring & Go, which, upon selecting a node in a network, brings all its direct neighbours into view, even if they are not located in the current zoomed-in view. The user can then navigate to any of the connected nodes by selecting it. Ghani et al. present a navigation technique based on small map insets (Figure 17(a)). A degree-of-interest function is used to determine which out-of-view nodes are most relevant; the selected nodes are then displayed in small map insets along the boundary of the map.

>The EdgeLense and its 3D counterpart, the 3DArcLens, push links away from the cursor by bending them. This makes it possible to see nodes and the underlying map more clearly. 

## Implementation

Use GEXF file format for node, vertex, start and end attributes

store data intermediatly in a js object, use accessor pattern to allow for selection of graph color, edge/node width 

animate snapshot steps with an interactable slider, or play auto,  smooth interpolation

## Prototype

```ts

import * as d3 from "https://cdn.skypack.dev/d3@7.6.1";



// -------------------- Types --------------------

type Node = {
  id: string;
  label?: string;
  [key: string]: any;
};

type Edge = {
  source: string;  // Node.id
  target: string;  // Node.id
  value: number;   // positive magnitude
  [key: string]: any;
};

interface KriskogramAccessors {
  nodeLabel?: (node: Node) => string;
  nodeColor?: (node: Node) => string;
  nodeRadius?: (node: Node) => number;
  nodeShape?: (node: Node) => "circle" | "rect";
  edgeWidth?: (edge: Edge) => number;
  edgeColor?: (edge: Edge, isAbove: boolean) => string;
  nodeOrder?: (node: Node) => string | number;
}

interface KriskogramConfig {
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

  // ---- Accessors with defaults ----
  const getNodeLabel = accessors.nodeLabel ?? ((d: Node) => d.label ?? d.id);
  const getNodeColor = accessors.nodeColor ?? (() => "#555");
  const getNodeRadius = accessors.nodeRadius ?? (() => 6);
  const getNodeShape = accessors.nodeShape ?? (() => "circle");
  const getEdgeWidth = accessors.edgeWidth ?? ((d: Edge) => Math.sqrt(d.value));
  const getEdgeColor =
    accessors.edgeColor ??
    ((d: Edge, isAbove: boolean) => (isAbove ? "#1f77b4" : "#d62728"));
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
    .style("font-family", "sans-serif");

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
    .attr("stroke", "#333");

  // ---- Nodes ----
  const nodeGroup = svg.append("g").attr("class", "nodes");

  nodeGroup
    .selectAll("g.node")
    .data(sortedNodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${xScale(d.id)},${baselineY})`)
    .each(function (d) {
      const g = d3.select(this);
      const shape = getNodeShape(d);
      const r = getNodeRadius(d);
      const fill = getNodeColor(d);

      if (shape === "circle") {
        g.append("circle").attr("r", r).attr("fill", fill);
      } else if (shape === "rect") {
        g.append("rect")
          .attr("x", -r)
          .attr("y", -r)
          .attr("width", 2 * r)
          .attr("height", 2 * r)
          .attr("fill", fill);
      }

      g.append("text")
        .attr("y", r + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text(getNodeLabel(d));
    });

  // ---- Arcs ----
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
    .attr("opacity", 0.85);
}

// -------------------- Example Usage --------------------

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

createKriskogram({
  nodes,
  edges,
  accessors: {
    nodeOrder: (d) => d.id, // alphabetical order
    nodeColor: (d) => (d.id === "A" ? "orange" : "#555"),
    nodeRadius: (d) => (d.id === "B" ? 10 : 6),
    edgeWidth: (e) => e.value / 2,
    edgeColor: (e, isAbove) => (isAbove ? "steelblue" : "tomato"),
  },
});
```

## 🚀 Deployment

This project is configured for automatic deployment to GitHub Pages.

### Quick Start
1. **Clone and install**:
   ```bash
   git clone <your-repo-url>
   cd Kriskogram
   npm install
   ```

2. **Run locally**:
   ```bash
   npm run dev
   ```

3. **Deploy to GitHub Pages**:
   - Push to `main` branch for automatic deployment
   - Or run `npm run deploy` for manual deployment

### Live Demo
- **Simple Demo**: `/kriskogram-simple` - Basic 4-node network
- **Full Demo**: `/kriskogram` - Complete GEXF data with temporal animation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to GitHub Pages
- `npm run lint` - Run linting
- `npm run format` - Format code

### Tech Stack
- **React 19** - UI framework
- **D3.js** - Data visualization
- **TanStack Router** - Routing
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Vite** - Build tool