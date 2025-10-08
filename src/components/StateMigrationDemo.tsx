import { useState, useEffect, useRef } from 'react';
import { parseStateMigrationCSV, loadCSVFromUrl, REGION_COLORS } from '../lib/csv-parser';
import type { MigrationData } from '../lib/csv-parser';
import Kriskogram from './Kriskogram';
import type { KriskogramRef } from './Kriskogram';

interface StateMigrationDemoProps {
  csvUrl?: string;
}

type ColorMode = 'grayscale' | 'region';

// Helper functions for color conversion
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function StateMigrationDemo({ csvUrl = '/src/data/State_to_State_Migrations_Table_2021.csv' }: StateMigrationDemoProps) {
  const [data, setData] = useState<MigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minThreshold, setMinThreshold] = useState(5000); // Minimum migration value to display
  const [maxThreshold, setMaxThreshold] = useState(200000); // Maximum migration value to display
  const [maxEdges, setMaxEdges] = useState(200); // Maximum number of edges to display
  const [colorMode, setColorMode] = useState<ColorMode>('grayscale'); // Color mode for arcs
  const kriskogramRef = useRef<KriskogramRef>(null);

  useEffect(() => {
    loadData();
  }, [csvUrl]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const csvContent = await loadCSVFromUrl(csvUrl);
      const parsedData = parseStateMigrationCSV(csvContent);
      setData(parsedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CSV data');
    } finally {
      setLoading(false);
    }
  };

  // Filter edges based on min/max threshold and max edges
  const filteredEdges = data 
    ? data.edges
        .filter(e => e.value >= minThreshold && e.value <= maxThreshold)
        .sort((a, b) => b.value - a.value)
        .slice(0, maxEdges)
    : [];

  // Get nodes that have at least one edge
  const activeNodeIds = new Set<string>();
  for (const edge of filteredEdges) {
    activeNodeIds.add(edge.source);
    activeNodeIds.add(edge.target);
  }
  const filteredNodes = data 
    ? data.nodes.filter(n => activeNodeIds.has(n.id))
    : [];

  const handleMinThresholdChange = (value: number) => {
    // Ensure min doesn't exceed max
    const newMin = Math.min(value, maxThreshold);
    setMinThreshold(newMin);
    // Update visualization
    if (kriskogramRef.current && data) {
      const edges = data.edges
        .filter(e => e.value >= newMin && e.value <= maxThreshold)
        .sort((a, b) => b.value - a.value)
        .slice(0, maxEdges);
      const nodeIds = new Set<string>();
      for (const edge of edges) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
      const nodes = data.nodes.filter(n => nodeIds.has(n.id));
      kriskogramRef.current.updateData(nodes, edges);
    }
  };

  const handleMaxThresholdChange = (value: number) => {
    // Ensure max doesn't go below min
    const newMax = Math.max(value, minThreshold);
    setMaxThreshold(newMax);
    // Update visualization
    if (kriskogramRef.current && data) {
      const edges = data.edges
        .filter(e => e.value >= minThreshold && e.value <= newMax)
        .sort((a, b) => b.value - a.value)
        .slice(0, maxEdges);
      const nodeIds = new Set<string>();
      for (const edge of edges) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
      const nodes = data.nodes.filter(n => nodeIds.has(n.id));
      kriskogramRef.current.updateData(nodes, edges);
    }
  };

  const handleMaxEdgesChange = (value: number) => {
    setMaxEdges(value);
    // Update visualization
    if (kriskogramRef.current && data) {
      const edges = data.edges
        .filter(e => e.value >= minThreshold && e.value <= maxThreshold)
        .sort((a, b) => b.value - a.value)
        .slice(0, value);
      const nodeIds = new Set<string>();
      for (const edge of edges) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
      const nodes = data.nodes.filter(n => nodeIds.has(n.id));
      kriskogramRef.current.updateData(nodes, edges);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading state migration data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Calculate statistics
  const totalMigrations = data.edges.reduce((sum, e) => sum + e.value, 0);
  const avgMigration = totalMigrations / data.edges.length;
  const maxMigration = Math.max(...data.edges.map(e => e.value));

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-2">State-to-State Migration Data (2021)</h2>
        <p className="text-gray-600 mb-4">
          Source: U.S. Census Bureau - American Community Survey 1-Year Estimates
        </p>
        
        {/* Statistics */}
        <div className="mb-6 p-4 bg-gray-50 rounded grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total States</div>
            <div className="text-2xl font-bold">{data.nodes.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Migration Flows</div>
            <div className="text-2xl font-bold">{data.edges.length.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Visible Nodes</div>
            <div className="text-2xl font-bold">{filteredNodes.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Visible Edges</div>
            <div className="text-2xl font-bold">{filteredEdges.length}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Color Mode Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Arc Color Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorMode"
                  value="grayscale"
                  checked={colorMode === 'grayscale'}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="w-4 h-4"
                />
                <span>Grayscale (weight-based luminosity)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorMode"
                  value="region"
                  checked={colorMode === 'region'}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="w-4 h-4"
                />
                <span>Region-based (same region colored)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Minimum Migration Threshold: {minThreshold.toLocaleString()} people
              </label>
              <button
                onClick={() => {
                  handleMinThresholdChange(0);
                  handleMaxThresholdChange(Math.round(maxMigration));
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Show All
              </button>
            </div>
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={200000}
                step={1000}
                value={minThreshold}
                onChange={(e) => handleMinThresholdChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className="font-semibold">0</span>
                <span>Average: {Math.round(avgMigration).toLocaleString()}</span>
                <span className="font-semibold">200,000</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Maximum Migration Threshold: {maxThreshold.toLocaleString()} people
            </label>
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={200000}
                step={1000}
                value={maxThreshold}
                onChange={(e) => handleMaxThresholdChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className="font-semibold">0</span>
                <span>Max in data: {Math.round(maxMigration).toLocaleString()}</span>
                <span className="font-semibold">200,000</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Max Edges to Display: {maxEdges}
            </label>
            <div className="relative pt-1">
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={maxEdges}
                onChange={(e) => handleMaxEdgesChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className="font-semibold">Min: 10</span>
                <span>250</span>
                <span className="font-semibold">Max: 500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kriskogram Visualization */}
        <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
          {filteredNodes.length > 0 && filteredEdges.length > 0 ? (
            <div>
              <Kriskogram
                key={`kriskogram-${colorMode}`}
                ref={kriskogramRef}
                nodes={filteredNodes}
                edges={filteredEdges}
                width={1200}
                height={700}
                margin={{ top: 80, right: 40, bottom: 120, left: 40 }}
                accessors={{
                  nodeOrder: (d) => d.label,
                  nodeColor: () => '#2563eb',
                  nodeRadius: () => 5,
                  edgeWidth: (e) => {
                    // Scale edge width based on migration volume
                    const minWidth = 0.5;
                    const maxWidth = 15;
                    const normalized = Math.log(e.value + 1) / Math.log(maxMigration + 1);
                    return minWidth + (normalized * (maxWidth - minWidth));
                  },
                  edgeColor: (e) => {
                    // Calculate luminosity based on migration volume
                    const normalized = e.value / maxMigration;
                    const lightness = 85 - (normalized * 60); // Range: 85% (light) to 25% (dark)
                    
                    if (colorMode === 'grayscale') {
                      // Grayscale mode - all arcs in grayscale with weight-based luminosity
                      return `hsl(0, 0%, ${lightness}%)`;
                    } else {
                      // Region-based coloring
                      const sourceNode = data?.nodes.find(n => n.id === e.source);
                      const targetNode = data?.nodes.find(n => n.id === e.target);
                      
                      // Check if both nodes are in the same region
                      if (sourceNode?.region && targetNode?.region && sourceNode.region === targetNode.region) {
                        // Same region - use region color with weight-based luminosity
                        const baseColor = REGION_COLORS[sourceNode.region];
                        
                        // Convert hex to HSL for lightness adjustment
                        // This is a simplified approach - extract RGB from hex
                        const rgb = hexToRgb(baseColor);
                        if (rgb) {
                          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                          return `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
                        }
                        return baseColor;
                      } else {
                        // Different regions - grayscale
                        return `hsl(0, 0%, ${lightness}%)`;
                      }
                    }
                  },
                }}
              />
              
              {/* Legend */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h4 className="text-sm font-semibold mb-2">Legend</h4>
                {colorMode === 'grayscale' ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        <div className="w-6 h-1 bg-gray-200"></div>
                        <div className="w-6 h-1 bg-gray-400"></div>
                        <div className="w-6 h-1 bg-gray-600"></div>
                        <div className="w-6 h-1 bg-gray-800"></div>
                      </div>
                      <span>Grayscale with weight-based luminosity (lighter = lower volume, darker = higher volume)</span>
                    </div>
                    <div className="text-gray-600">
                      Edge darkness = migration volume | Edge width = log-scaled volume
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(REGION_COLORS).map(([region, color]) => (
                        <div key={region} className="flex items-center gap-2">
                          <div className="w-8 h-1" style={{ backgroundColor: color }}></div>
                          <span>{region} (same-region flows)</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        <div className="w-6 h-1 bg-gray-200"></div>
                        <div className="w-6 h-1 bg-gray-400"></div>
                        <div className="w-6 h-1 bg-gray-600"></div>
                      </div>
                      <span>Grayscale (cross-region flows)</span>
                    </div>
                    <div className="text-gray-600">
                      Arc lightness = migration volume (lighter = lower, darker = higher) | Width = log-scaled volume
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No migration data meets the current threshold range ({minThreshold.toLocaleString()} - {maxThreshold.toLocaleString()}). Try adjusting the thresholds.
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">About This Visualization</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Each state is represented as a node along the baseline (sorted alphabetically)</li>
            <li>• Arcs represent migration flows between states in 2021</li>
            <li>• Arc thickness indicates migration volume (log-scaled for visibility)</li>
            <li>• Arc luminosity (darkness) shows migration volume - darker arcs = higher migration</li>
            <li>• <strong>Grayscale mode:</strong> All arcs in grayscale with weight-based luminosity</li>
            <li>• <strong>Region mode:</strong> Same-region migrations are colored by region (Northeast=Blue, Midwest=Amber, South=Red, West=Green), cross-region flows remain grayscale</li>
            <li>• Use the min/max threshold sliders to focus on a specific range of migration volumes</li>
            <li>• Adjust max edges to limit visual complexity</li>
          </ul>
        </div>

        {/* Top Migrations */}
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold text-gray-900 p-2 bg-gray-100 rounded hover:bg-gray-200">
            Top 20 Migration Flows
          </summary>
          <div className="mt-2 overflow-auto max-h-96">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">From</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-right">Migrants</th>
                  <th className="px-4 py-2 text-right">MOE (±)</th>
                </tr>
              </thead>
              <tbody>
                {data.edges
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 20)
                  .map((edge, idx) => {
                    const sourceNode = data.nodes.find(n => n.id === edge.source);
                    const targetNode = data.nodes.find(n => n.id === edge.target);
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{sourceNode?.label || edge.source}</td>
                        <td className="px-4 py-2">{targetNode?.label || edge.target}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {edge.value.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-gray-500">
                          {edge.moe ? edge.moe.toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}

export default StateMigrationDemo;

