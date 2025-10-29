# Data Structure Compatibility Guide

This document explains how data flows through the application, from import to visualization, and compatibility considerations for different visualization types.

## Common Data Format

All visualizations in this application work with a common node/edge format:

### Node Structure
```typescript
{
  id: string          // Required: Unique identifier
  label?: string      // Optional: Display name
  [key: string]: any  // Optional: Any additional properties
}
```

### Edge Structure
```typescript
{
  source: string      // Required: Node ID (source)
  target: string      // Required: Node ID (target)
  value: number       // Required: Flow magnitude/weight
  [key: string]: any  // Optional: Any additional properties
}
```

## Import Formats

### CSV Format (State Migration Data)

**Structure:**
- Header rows: First 3 lines contain metadata and column headers
- Data rows: Starting from line 4, each row represents a source state
- Columns: Source state, followed by estimate/MOE pairs for each destination state

**Node Properties (Auto-extracted):**
- `id`: Normalized state name (e.g., "CALIFORNIA")
- `label`: Full state name (e.g., "California")
- `region`: U.S. Census region (Northeast, Midwest, South, West)
- `division`: U.S. Census division (e.g., "Pacific", "New England")

**Edge Properties:**
- `source`: Source state ID
- `target`: Destination state ID
- `value`: Migration count (estimated)
- `moe?`: Margin of error (if available)

**Limitations:**
- Single timestamp/snapshot (no temporal data)
- Only supports U.S. state-level data currently
- Bidirectional flows handled automatically

### GEXF Format (Graph Exchange XML Format)

**Structure:**
- XML-based format with `<graph>` element containing nodes and edges
- Supports temporal data via `<spells>` elements
- Custom attributes defined in `<attributes>` section

**Node Properties:**
- `id`: Node identifier from XML
- `label`: Node label from XML
- Additional properties from `<attvalue>` elements (e.g., `region`, `population`, `economic_index`, `latitude`, `longitude`)

**Edge Properties:**
- `source`: Source node ID
- `target`: Target node ID
- `value`: Edge weight from XML
- Additional properties from `<attvalue>` elements (e.g., `migration_type`, `distance_km`, `economic_factor`)

**Supported Features:**
- Temporal/spatial data via spells (multiple time snapshots)
- Custom node and edge attributes
- Edge types via attributes (e.g., `migration_type` with values like "career", "economic", "lifestyle")

## Visualization Compatibility

### Kriskogram ✅ Direct Compatibility

**Requirements:**
- Nodes: `id`, optional `label`, any additional properties
- Edges: `source`, `target`, `value`

**Compatibility:** Direct - no transformation needed. The current data format is designed for Kriskograms.

**Features:**
- Supports all node/edge properties for coloring and ordering
- Handles bidirectional flows naturally
- Temporal data via snapshots

### Sankey Diagram ✅ Adapter Required

**Requirements:**
- Nodes: Array with unique identifiers
- Links: Array with `source`/`target` as indices (not IDs) and `value`

**Compatibility:** Good - adapter converts ID-based edges to index-based links.

**Adapter Function:** `toSankeyFormat()` in `src/lib/data-adapters.ts`

**Transformation:**
```typescript
// Input (common format)
nodes: [{ id: "A", label: "Node A" }, { id: "B", label: "Node B" }]
edges: [{ source: "A", target: "B", value: 10 }]

// Output (Sankey format)
nodes: [{ id: "A", name: "Node A" }, { id: "B", name: "Node B" }]
links: [{ source: 0, target: 1, value: 10 }]  // Indices instead of IDs
```

**Limitations:**
- Sankey diagrams assume unidirectional flows (left-to-right)
- Bidirectional migration flows may require workarounds (e.g., separate source/destination layers)
- Temporal data would need separate Sankey diagrams per snapshot

### Chord Diagram ⚠️ Matrix Transformation Required

**Requirements:**
- Matrix: Square n×n matrix where `matrix[i][j]` = flow from node i to node j
- Labels: Array of node labels/properties

**Compatibility:** Requires transformation - edges must be converted to matrix format.

**Adapter Function:** `toChordFormat()` in `src/lib/data-adapters.ts`

**Transformation:**
```typescript
// Input (common format)
nodes: [{ id: "A" }, { id: "B" }, { id: "C" }]
edges: [
  { source: "A", target: "B", value: 10 },
  { source: "B", target: "C", value: 5 },
  { source: "C", target: "A", value: 8 }
]

// Output (Chord format)
matrix: [
  [0, 10, 0],  // A -> A, A -> B, A -> C
  [0, 0, 5],   // B -> A, B -> B, B -> C
  [8, 0, 0]    // C -> A, C -> B, C -> C
]
labels: ["A", "B", "C"]
```

**Limitations:**
- Loses individual edge properties in matrix format (only aggregates values)
- Bidirectional flows handled naturally in matrix
- Temporal data would need separate matrices per snapshot
- Matrix grows quadratically with node count (n² entries for n nodes)

### Table View ✅ Direct Compatibility

**Requirements:**
- Any structure with nodes and edges
- Dynamically extracts all properties for columns

**Compatibility:** Direct - displays all properties from nodes and edges in sortable tables.

**Features:**
- Dynamic column detection
- Separate tabs for nodes and edges
- All properties visible and sortable

## Edge Type Filtering

For datasets with edge type properties (e.g., `migration_type` in GEXF files), you can filter edges by type:

**Supported Properties (auto-detected):**
- `migration_type`
- `type`
- `category`
- `edge_type`

**Usage:**
1. Import a GEXF file with edge attributes (e.g., `migration_type: "economic"`)
2. The explorer automatically detects available edge types
3. Select "All Types (Total)" to see aggregated flows
4. Select a specific type (e.g., "career", "economic", "lifestyle") to filter

**Example (GEXF):**
```xml
<edge id="e1" source="NYC" target="LA" weight="12500">
  <attvalues>
    <attvalue for="0" value="economic"/>
  </attvalues>
</edge>
```

This edge will have `migration_type: "economic"` and can be filtered in the explorer.

## Data Flow

```
Import (CSV/GEXF)
    ↓
Parse & Detect Properties
    ↓
Store in IndexedDB (with metadata)
    ↓
Load Snapshot for Selected Year
    ↓
Filter by Type/Threshold/Count
    ↓
Transform for Visualization (if needed)
    ↓
Render (Kriskogram/Sankey/Chord/Table)
```

## Recommendations

1. **For Kriskogram visualization:** Use the common format directly - perfect compatibility
2. **For Sankey visualization:** Use adapter, but be aware of bidirectional flow limitations
3. **For Chord visualization:** Use adapter, but consider matrix size for large datasets
4. **For Analysis:** Use Table view to see all properties and export data
5. **For Temporal Data:** Use GEXF format with spells for multiple snapshots
6. **For Edge Type Analysis:** Use GEXF with edge attributes to enable type filtering

