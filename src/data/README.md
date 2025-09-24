# GEXF Data and Parser

This directory contains sample GEXF (Graph Exchange XML Format) data and utilities for working with network data in the Kriskogram visualization.

## Files

### `sample-migration-data.gexf`
A comprehensive GEXF file containing migration data between major US cities from 2020-2024. The data includes:

- **10 nodes**: Major US cities (NYC, LA, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Jose)
- **50 edges**: Migration flows between cities across 5 years (2020-2024)
- **Node attributes**: Region, population, latitude/longitude, economic index
- **Edge attributes**: Migration type, distance, economic factor
- **Temporal data**: Each edge has time spells indicating when the migration occurred

### `example-usage.ts`
Example code showing how to use the GEXF parser with your Kriskogram implementation.

## GEXF Parser (`../lib/gexf-parser.ts`)

The parser provides the following functionality:

### Core Functions

- `parseGexf(xmlString)`: Parse GEXF XML into structured JavaScript objects
- `loadGexfFromUrl(url)`: Load GEXF data from a URL
- `gexfToKriskogramSnapshots(gexfGraph)`: Convert GEXF to animation-ready snapshots
- `getSnapshotForYear(gexfGraph, year)`: Get data for a specific year

### Data Types

- `GexfNode`: Raw GEXF node with attributes and time spells
- `GexfEdge`: Raw GEXF edge with attributes and time spells
- `KriskogramNode`: Processed node for visualization
- `KriskogramEdge`: Processed edge for visualization
- `KriskogramSnapshot`: Complete snapshot for a specific time

## Usage Examples

### Basic Usage

```typescript
import { loadGexfFromUrl, gexfToKriskogramSnapshots } from '../lib/gexf-parser';

// Load data
const gexfGraph = await loadGexfFromUrl('/src/data/sample-migration-data.gexf');

// Convert to snapshots
const snapshots = gexfToKriskogramSnapshots(gexfGraph);

// Use with Kriskogram
const config = {
  nodes: snapshots[0].nodes,
  edges: snapshots[0].edges,
  // ... other config
};
createKriskogram(config);
```

### Animation

```typescript
// Get all snapshots for animation
const snapshots = gexfToKriskogramSnapshots(gexfGraph);

// Animate through years
snapshots.forEach((snapshot, index) => {
  setTimeout(() => {
    updateKriskogram(snapshot);
  }, index * 1000);
});
```

### Custom Attributes

The GEXF data includes custom attributes that can be used for styling:

- `region`: Geographic region (Northeast, West Coast, etc.)
- `population`: City population
- `latitude`/`longitude`: Geographic coordinates
- `economic_index`: Economic strength indicator (0-1)
- `migration_type`: Type of migration (economic, career, lifestyle)
- `distance_km`: Distance between cities
- `economic_factor`: Economic factor influencing migration

## Data Structure

### Nodes
Each node represents a major US city with:
- Unique ID and label
- Geographic coordinates
- Population and economic data
- Time spells (when the city appears in the data)

### Edges
Each edge represents migration flow with:
- Source and target city IDs
- Migration volume (weight)
- Migration type and distance
- Economic factors
- Time spells (when migration occurred)

### Temporal Data
The data spans 2020-2024 with yearly snapshots showing:
- Changing migration patterns
- Economic shifts
- Population movements

## Integration with Kriskogram

The parser is designed to work seamlessly with your Kriskogram implementation:

1. Load GEXF data using the parser
2. Convert to snapshots for animation
3. Use accessor functions to style nodes and edges
4. Implement temporal controls for animation

See `example-usage.ts` for complete integration examples.
