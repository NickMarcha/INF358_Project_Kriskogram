/**
 * GEXF Parser for Kriskogram Data
 * 
 * This utility parses GEXF (Graph Exchange XML Format) files and converts them
 * into JavaScript objects suitable for use with the Kriskogram visualization.
 */

export interface GexfNode {
  id: string;
  label: string;
  attributes: Record<string, any>;
  spells: Array<{ start: number; end: number }>;
}

export interface GexfEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  attributes: Record<string, any>;
  spells: Array<{ start: number; end: number }>;
}

export interface GexfGraph {
  nodes: GexfNode[];
  edges: GexfEdge[];
  attributes: {
    node: Record<string, { id: string; title: string; type: string }>;
    edge: Record<string, { id: string; title: string; type: string }>;
  };
  timeRange: { start: number; end: number };
}

export interface KriskogramNode {
  id: string;
  label: string;
  region?: string;
  population?: number;
  latitude?: number;
  longitude?: number;
  economic_index?: number;
  [key: string]: any;
}

export interface KriskogramEdge {
  source: string;
  target: string;
  value: number;
  migration_type?: string;
  distance_km?: number;
  economic_factor?: number;
  [key: string]: any;
}

export interface KriskogramSnapshot {
  nodes: KriskogramNode[];
  edges: KriskogramEdge[];
  timestamp: number;
}

/**
 * Parse a GEXF XML string into a structured graph object
 */
export function parseGexf(gexfXml: string): GexfGraph {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gexfXml, 'text/xml');
  
  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`GEXF parsing error: ${parseError.textContent}`);
  }

  const graph = doc.querySelector('graph');
  if (!graph) {
    throw new Error('No graph element found in GEXF file');
  }

  // Parse attributes
  const nodeAttributes = parseAttributes(graph, 'node');
  const edgeAttributes = parseAttributes(graph, 'edge');

  // Parse nodes
  const nodes = parseNodes(graph, nodeAttributes);

  // Parse edges
  const edges = parseEdges(graph, edgeAttributes);

  // Determine time range
  const timeRange = calculateTimeRange(nodes, edges);

  return {
    nodes,
    edges,
    attributes: {
      node: nodeAttributes,
      edge: edgeAttributes,
    },
    timeRange,
  };
}

/**
 * Convert GEXF graph to Kriskogram snapshots for animation
 */
export function gexfToKriskogramSnapshots(gexfGraph: GexfGraph): KriskogramSnapshot[] {
  const { timeRange } = gexfGraph;
  const snapshots: KriskogramSnapshot[] = [];

  for (let year = timeRange.start; year <= timeRange.end; year++) {
    const snapshot: KriskogramSnapshot = {
      nodes: [],
      edges: [],
      timestamp: year,
    };

    // Add nodes that exist in this year
    gexfGraph.nodes.forEach(node => {
      if (isActiveInYear(node.spells, year)) {
        snapshot.nodes.push(gexfNodeToKriskogramNode(node));
      }
    });

    // Add edges that exist in this year
    gexfGraph.edges.forEach(edge => {
      if (isActiveInYear(edge.spells, year)) {
        snapshot.edges.push(gexfEdgeToKriskogramEdge(edge));
      }
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

/**
 * Get a single snapshot for a specific year
 */
export function getSnapshotForYear(gexfGraph: GexfGraph, year: number): KriskogramSnapshot {
  const nodes = gexfGraph.nodes
    .filter(node => isActiveInYear(node.spells, year))
    .map(gexfNodeToKriskogramNode);

  const edges = gexfGraph.edges
    .filter(edge => isActiveInYear(edge.spells, year))
    .map(gexfEdgeToKriskogramEdge);

  return {
    nodes,
    edges,
    timestamp: year,
  };
}

/**
 * Load GEXF data from a file URL
 */
export async function loadGexfFromUrl(url: string): Promise<GexfGraph> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch GEXF file: ${response.statusText}`);
    }
    const xmlText = await response.text();
    return parseGexf(xmlText);
  } catch (error) {
    throw new Error(`Error loading GEXF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions

function parseAttributes(graph: Element, type: 'node' | 'edge'): Record<string, { id: string; title: string; type: string }> {
  const attributes: Record<string, { id: string; title: string; type: string }> = {};
  const attributesElement = graph.querySelector(`attributes[class="${type}"]`);
  
  if (attributesElement) {
    const attributeElements = attributesElement.querySelectorAll('attribute');
    attributeElements.forEach(attr => {
      const id = attr.getAttribute('id');
      const title = attr.getAttribute('title');
      const type = attr.getAttribute('type');
      
      if (id && title && type) {
        attributes[id] = { id, title, type };
      }
    });
  }
  
  return attributes;
}

function parseNodes(graph: Element, nodeAttributes: Record<string, any>): GexfNode[] {
  const nodes: GexfNode[] = [];
  const nodeElements = graph.querySelectorAll('node');
  
  nodeElements.forEach(nodeElement => {
    const id = nodeElement.getAttribute('id');
    const label = nodeElement.getAttribute('label') || id || '';
    
    if (!id) return;
    
    // Parse attributes
    const attributes: Record<string, any> = {};
    const attvalues = nodeElement.querySelectorAll('attvalue');
    attvalues.forEach(attvalue => {
      const forAttr = attvalue.getAttribute('for');
      const value = attvalue.getAttribute('value');
      
      if (forAttr && value !== null) {
        const attrDef = nodeAttributes[forAttr];
        if (attrDef) {
          attributes[attrDef.title] = convertAttributeValue(value, attrDef.type);
        }
      }
    });
    
    // Parse spells (time periods)
    const spells: Array<{ start: number; end: number }> = [];
    const spellElements = nodeElement.querySelectorAll('spell');
    spellElements.forEach(spell => {
      const start = parseInt(spell.getAttribute('start') || '0');
      const end = parseInt(spell.getAttribute('end') || '0');
      spells.push({ start, end });
    });
    
    nodes.push({
      id,
      label,
      attributes,
      spells,
    });
  });
  
  return nodes;
}

function parseEdges(graph: Element, edgeAttributes: Record<string, any>): GexfEdge[] {
  const edges: GexfEdge[] = [];
  const edgeElements = graph.querySelectorAll('edge');
  
  edgeElements.forEach(edgeElement => {
    const id = edgeElement.getAttribute('id');
    const source = edgeElement.getAttribute('source');
    const target = edgeElement.getAttribute('target');
    const weight = parseFloat(edgeElement.getAttribute('weight') || '1');
    
    if (!id || !source || !target) return;
    
    // Parse attributes
    const attributes: Record<string, any> = {};
    const attvalues = edgeElement.querySelectorAll('attvalue');
    attvalues.forEach(attvalue => {
      const forAttr = attvalue.getAttribute('for');
      const value = attvalue.getAttribute('value');
      
      if (forAttr && value !== null) {
        const attrDef = edgeAttributes[forAttr];
        if (attrDef) {
          attributes[attrDef.title] = convertAttributeValue(value, attrDef.type);
        }
      }
    });
    
    // Parse spells (time periods)
    const spells: Array<{ start: number; end: number }> = [];
    const spellElements = edgeElement.querySelectorAll('spell');
    spellElements.forEach(spell => {
      const start = parseInt(spell.getAttribute('start') || '0');
      const end = parseInt(spell.getAttribute('end') || '0');
      spells.push({ start, end });
    });
    
    edges.push({
      id,
      source,
      target,
      weight,
      attributes,
      spells,
    });
  });
  
  return edges;
}

function convertAttributeValue(value: string, type: string): any {
  switch (type) {
    case 'integer':
      return parseInt(value, 10);
    case 'double':
    case 'float':
      return parseFloat(value);
    case 'boolean':
      return value.toLowerCase() === 'true';
    default:
      return value;
  }
}

function calculateTimeRange(nodes: GexfNode[], edges: GexfEdge[]): { start: number; end: number } {
  let minTime = Infinity;
  let maxTime = -Infinity;
  
  [...nodes, ...edges].forEach(item => {
    item.spells.forEach(spell => {
      minTime = Math.min(minTime, spell.start);
      maxTime = Math.max(maxTime, spell.end);
    });
  });
  
  return {
    start: minTime === Infinity ? 0 : minTime,
    end: maxTime === -Infinity ? 0 : maxTime,
  };
}

function isActiveInYear(spells: Array<{ start: number; end: number }>, year: number): boolean {
  return spells.some(spell => year >= spell.start && year <= spell.end);
}

function gexfNodeToKriskogramNode(gexfNode: GexfNode): KriskogramNode {
  return {
    id: gexfNode.id,
    label: gexfNode.label,
    ...gexfNode.attributes,
  };
}

function gexfEdgeToKriskogramEdge(gexfEdge: GexfEdge): KriskogramEdge {
  return {
    source: gexfEdge.source,
    target: gexfEdge.target,
    value: gexfEdge.weight,
    ...gexfEdge.attributes,
  };
}

/**
 * Utility function to create sample data for testing
 */
export function createSampleKriskogramData(): { nodes: KriskogramNode[]; edges: KriskogramEdge[] } {
  return {
    nodes: [
      { id: "NYC", label: "New York City", region: "Northeast", population: 8336817, latitude: 40.7128, longitude: -74.0060, economic_index: 0.95 },
      { id: "LA", label: "Los Angeles", region: "West Coast", population: 3971883, latitude: 34.0522, longitude: -118.2437, economic_index: 0.88 },
      { id: "CHI", label: "Chicago", region: "Midwest", population: 2746388, latitude: 41.8781, longitude: -87.6298, economic_index: 0.82 },
      { id: "HOU", label: "Houston", region: "South", population: 2320268, latitude: 29.7604, longitude: -95.3698, economic_index: 0.78 },
      { id: "PHX", label: "Phoenix", region: "Southwest", population: 1608139, latitude: 33.4484, longitude: -112.0740, economic_index: 0.75 },
    ],
    edges: [
      { source: "NYC", target: "LA", value: 12500, migration_type: "economic", distance_km: 3944.0, economic_factor: 0.15 },
      { source: "LA", target: "NYC", value: 8900, migration_type: "economic", distance_km: 3944.0, economic_factor: 0.12 },
      { source: "CHI", target: "NYC", value: 15200, migration_type: "career", distance_km: 1266.0, economic_factor: 0.18 },
      { source: "HOU", target: "DAL", value: 18700, migration_type: "economic", distance_km: 239.0, economic_factor: 0.08 },
      { source: "PHX", target: "LA", value: 11200, migration_type: "lifestyle", distance_km: 373.0, economic_factor: 0.10 },
    ],
  };
}
