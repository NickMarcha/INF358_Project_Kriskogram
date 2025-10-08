/**
 * Parser for State-to-State Migration CSV data
 */

export interface MigrationNode {
  id: string;
  label: string;
  region?: string;
  division?: string;
}

// U.S. Census Bureau Regional Divisions
const STATE_REGIONS: Record<string, { region: string; division: string }> = {
  // Northeast - New England
  'Connecticut': { region: 'Northeast', division: 'New England' },
  'Maine': { region: 'Northeast', division: 'New England' },
  'Massachusetts': { region: 'Northeast', division: 'New England' },
  'New Hampshire': { region: 'Northeast', division: 'New England' },
  'Rhode Island': { region: 'Northeast', division: 'New England' },
  'Vermont': { region: 'Northeast', division: 'New England' },
  // Northeast - Mid-Atlantic
  'New Jersey': { region: 'Northeast', division: 'Mid-Atlantic' },
  'New York': { region: 'Northeast', division: 'Mid-Atlantic' },
  'Pennsylvania': { region: 'Northeast', division: 'Mid-Atlantic' },
  'Delaware': { region: 'Northeast', division: 'Mid-Atlantic' },
  'Maryland': { region: 'Northeast', division: 'Mid-Atlantic' },
  // Midwest - East North Central
  'Illinois': { region: 'Midwest', division: 'East North Central' },
  'Indiana': { region: 'Midwest', division: 'East North Central' },
  'Michigan': { region: 'Midwest', division: 'East North Central' },
  'Ohio': { region: 'Midwest', division: 'East North Central' },
  'Wisconsin': { region: 'Midwest', division: 'East North Central' },
  // Midwest - West North Central
  'Iowa': { region: 'Midwest', division: 'West North Central' },
  'Kansas': { region: 'Midwest', division: 'West North Central' },
  'Minnesota': { region: 'Midwest', division: 'West North Central' },
  'Missouri': { region: 'Midwest', division: 'West North Central' },
  'Nebraska': { region: 'Midwest', division: 'West North Central' },
  'North Dakota': { region: 'Midwest', division: 'West North Central' },
  'South Dakota': { region: 'Midwest', division: 'West North Central' },
  // South - South Atlantic
  'District of Columbia': { region: 'South', division: 'South Atlantic' },
  'Florida': { region: 'South', division: 'South Atlantic' },
  'Georgia': { region: 'South', division: 'South Atlantic' },
  'North Carolina': { region: 'South', division: 'South Atlantic' },
  'South Carolina': { region: 'South', division: 'South Atlantic' },
  'Virginia': { region: 'South', division: 'South Atlantic' },
  'West Virginia': { region: 'South', division: 'South Atlantic' },
  // South - East South Central
  'Alabama': { region: 'South', division: 'East South Central' },
  'Kentucky': { region: 'South', division: 'East South Central' },
  'Mississippi': { region: 'South', division: 'East South Central' },
  'Tennessee': { region: 'South', division: 'East South Central' },
  // South - West South Central
  'Arkansas': { region: 'South', division: 'West South Central' },
  'Louisiana': { region: 'South', division: 'West South Central' },
  'Oklahoma': { region: 'South', division: 'West South Central' },
  'Texas': { region: 'South', division: 'West South Central' },
  // West - Mountain
  'Arizona': { region: 'West', division: 'Mountain' },
  'Colorado': { region: 'West', division: 'Mountain' },
  'Idaho': { region: 'West', division: 'Mountain' },
  'Montana': { region: 'West', division: 'Mountain' },
  'Nevada': { region: 'West', division: 'Mountain' },
  'New Mexico': { region: 'West', division: 'Mountain' },
  'Utah': { region: 'West', division: 'Mountain' },
  'Wyoming': { region: 'West', division: 'Mountain' },
  // West - Pacific
  'Alaska': { region: 'West', division: 'Pacific' },
  'California': { region: 'West', division: 'Pacific' },
  'Hawaii': { region: 'West', division: 'Pacific' },
  'Oregon': { region: 'West', division: 'Pacific' },
  'Washington': { region: 'West', division: 'Pacific' },
};

// Region colors
export const REGION_COLORS: Record<string, string> = {
  'Northeast': '#3b82f6', // Blue
  'Midwest': '#f59e0b',   // Amber
  'South': '#ef4444',     // Red
  'West': '#10b981',      // Green
};

export interface MigrationEdge {
  source: string;
  target: string;
  value: number;
  moe?: number; // Margin of error
}

export interface MigrationData {
  nodes: MigrationNode[];
  edges: MigrationEdge[];
}

/**
 * Parse the state-to-state migration CSV data
 * Format:
 * - Line 1-3: Headers
 * - Line 4+: State data with estimate/MOE pairs for each destination
 */
export function parseStateMigrationCSV(csvContent: string): MigrationData {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 4) {
    throw new Error('Invalid CSV format: needs at least 4 lines (3 headers + data)');
  }

  // Parse header line 2 to get destination state names
  const headerLine2 = lines[1];
  const stateHeaders = parseCSVLine(headerLine2);
  
  // Extract destination state names (skip first few columns which are metadata)
  const destinationStates: string[] = [];
  for (let i = 7; i < stateHeaders.length; i += 2) {
    const stateName = stateHeaders[i].trim();
    if (stateName && stateName !== 'Total' && !stateName.includes('year ago')) {
      destinationStates.push(stateName);
    }
  }

  const nodes: MigrationNode[] = [];
  const edges: MigrationEdge[] = [];
  const nodeIds = new Set<string>();

  // Parse data rows (starting from line 4, index 3)
  for (let i = 3; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const sourceState = values[0].trim();
    
    // Skip non-state rows
    if (!sourceState || sourceState === 'Puerto Rico') continue;
    
    // Add source node
    const sourceId = normalizeStateName(sourceState);
    if (!nodeIds.has(sourceId)) {
      nodeIds.add(sourceId);
      const regionInfo = STATE_REGIONS[sourceState];
      nodes.push({
        id: sourceId,
        label: sourceState,
        region: regionInfo?.region,
        division: regionInfo?.division
      });
    }

    // Parse migration data - starts at column 7 (after metadata columns)
    let destIndex = 0;
    for (let col = 9; col < values.length && destIndex < destinationStates.length; col += 2) {
      const destState = destinationStates[destIndex];
      if (!destState) {
        destIndex++;
        continue;
      }

      const destId = normalizeStateName(destState);
      const estimateStr = values[col]?.trim();
      const moeStr = values[col + 1]?.trim();

      // Skip if source and destination are the same (N/A in original data)
      if (sourceId === destId) {
        destIndex++;
        continue;
      }

      // Add destination node if not already added
      if (!nodeIds.has(destId)) {
        nodeIds.add(destId);
        const regionInfo = STATE_REGIONS[destState];
        nodes.push({
          id: destId,
          label: destState,
          region: regionInfo?.region,
          division: regionInfo?.division
        });
      }

      // Parse estimate value
      if (estimateStr && estimateStr !== 'N/A' && estimateStr !== '0') {
        const estimate = parseNumberWithCommas(estimateStr);
        if (estimate > 0) {
          const edge: MigrationEdge = {
            source: sourceId,
            target: destId,
            value: estimate
          };

          // Add MOE if available
          if (moeStr && moeStr !== '+/- 0') {
            const moe = parseNumberWithCommas(moeStr.replace('+/- ', '').replace('+/-', ''));
            if (moe > 0) {
              edge.moe = moe;
            }
          }

          edges.push(edge);
        }
      }

      destIndex++;
    }
  }

  // Sort nodes alphabetically
  nodes.sort((a, b) => a.label.localeCompare(b.label));

  return { nodes, edges };
}

/**
 * Parse a CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Parse numbers that may contain commas and quotes
 */
function parseNumberWithCommas(str: string): number {
  const cleaned = str.replace(/[",]/g, '');
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Normalize state name to create consistent IDs
 */
function normalizeStateName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();
}

/**
 * Load CSV from URL
 */
export async function loadCSVFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.statusText}`);
  }
  return response.text();
}

