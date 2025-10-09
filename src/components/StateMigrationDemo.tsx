import { useState, useEffect, useRef } from 'react';
import { parseStateMigrationCSV, loadCSVFromUrl, REGION_COLORS, DIVISION_COLORS } from '../lib/csv-parser';
import type { MigrationData } from '../lib/csv-parser';
import Kriskogram from './Kriskogram';
import type { KriskogramRef } from './Kriskogram';

interface StateMigrationDemoProps {
  csvUrl?: string;
}

type ColorMode = 'grayscale' | 'region' | 'division';
type OrderMode = 'alphabetical' | 'region' | 'division';

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

export function StateMigrationDemo({ 
  csvUrl = `${import.meta.env.BASE_URL}data/State_to_State_Migrations_Table_2021.csv` 
}: StateMigrationDemoProps) {
  const [data, setData] = useState<MigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minThreshold, setMinThreshold] = useState(5000); // Minimum migration value to display
  const [maxThreshold, setMaxThreshold] = useState(200000); // Maximum migration value to display
  const [maxEdges, setMaxEdges] = useState(200); // Maximum number of edges to display
  const [colorMode, setColorMode] = useState<ColorMode>('grayscale'); // Color mode for arcs
  const [orderMode, setOrderMode] = useState<OrderMode>('alphabetical'); // Node ordering mode
  const [arcOpacity, setArcOpacity] = useState(0.6); // Arc transparency (0 = fully transparent, 1 = fully opaque)
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
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorMode"
                  value="grayscale"
                  checked={colorMode === 'grayscale'}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="w-4 h-4"
                />
                <span>Grayscale</span>
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
                <span>Region (4 regions)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorMode"
                  value="division"
                  checked={colorMode === 'division'}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="w-4 h-4"
                />
                <span>Division (9 divisions)</span>
              </label>
            </div>
          </div>

          {/* Node Ordering Mode Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Node Ordering (Horizontal Axis)</label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderMode"
                  value="alphabetical"
                  checked={orderMode === 'alphabetical'}
                  onChange={(e) => setOrderMode(e.target.value as OrderMode)}
                  className="w-4 h-4"
                />
                <span>Alphabetical</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderMode"
                  value="region"
                  checked={orderMode === 'region'}
                  onChange={(e) => setOrderMode(e.target.value as OrderMode)}
                  className="w-4 h-4"
                />
                <span>By Region</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderMode"
                  value="division"
                  checked={orderMode === 'division'}
                  onChange={(e) => setOrderMode(e.target.value as OrderMode)}
                  className="w-4 h-4"
                />
                <span>By Division</span>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Arc Opacity: {Math.round(arcOpacity * 100)}%
            </label>
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={arcOpacity}
                onChange={(e) => setArcOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className="font-semibold">0% (Transparent)</span>
                <span>50%</span>
                <span className="font-semibold">100% (Opaque)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kriskogram Visualization */}
        <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
          {filteredNodes.length > 0 && filteredEdges.length > 0 ? (
            <div>
              <Kriskogram
                key={`kriskogram-${colorMode}-${orderMode}-${arcOpacity}`}
                ref={kriskogramRef}
                nodes={filteredNodes}
                edges={filteredEdges}
                width={1200}
                height={700}
                margin={{ top: 80, right: 40, bottom: 120, left: 40 }}
                arcOpacity={arcOpacity}
                accessors={{
                  nodeOrder: (d) => {
                    // Order nodes based on selected mode
                    if (orderMode === 'region') {
                      // Primary: region, Secondary: label
                      return `${d.region || 'ZZZ'}_${d.label || d.id}`;
                    } else if (orderMode === 'division') {
                      // Primary: division, Secondary: label
                      return `${d.division || 'ZZZ'}_${d.label || d.id}`;
                    } else {
                      // Alphabetical by label
                      return d.label || d.id;
                    }
                  },
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
                    // Calculate luminosity based on migration volume using DISCRETE steps
                    const normalized = e.value / maxMigration;
                    
                    // Define discrete luminosity levels to match legend
                    const lightnessLevels = colorMode === 'division' 
                      ? [85, 55, 25]  // 3 steps for division mode
                      : [85, 70, 55, 40, 25]; // 5 steps for grayscale/region mode
                    
                    // Bin the normalized value into discrete steps
                    const stepSize = 1 / lightnessLevels.length;
                    const stepIndex = Math.min(
                      Math.floor(normalized / stepSize),
                      lightnessLevels.length - 1
                    );
                    const lightness = lightnessLevels[stepIndex];
                    
                    if (colorMode === 'grayscale') {
                      // Grayscale mode - all arcs in grayscale with discrete luminosity steps
                      return `hsl(0, 0%, ${lightness}%)`;
                    } else if (colorMode === 'region') {
                      // Region-based coloring
                      const sourceNode = data?.nodes.find(n => n.id === e.source);
                      const targetNode = data?.nodes.find(n => n.id === e.target);
                      
                      // Check if both nodes are in the same region
                      if (sourceNode?.region && targetNode?.region && sourceNode.region === targetNode.region) {
                        // Same region - use region color with weight-based luminosity
                        const baseColor = REGION_COLORS[sourceNode.region];
                        
                        // Convert hex to HSL for lightness adjustment
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
                    } else {
                      // Division-based coloring
                      const sourceNode = data?.nodes.find(n => n.id === e.source);
                      const targetNode = data?.nodes.find(n => n.id === e.target);
                      
                      // Check if both nodes are in the same division
                      if (sourceNode?.division && targetNode?.division && sourceNode.division === targetNode.division) {
                        // Same division - use division color with weight-based luminosity
                        const baseColor = DIVISION_COLORS[sourceNode.division];
                        
                        // Convert hex to HSL for lightness adjustment
                        const rgb = hexToRgb(baseColor);
                        if (rgb) {
                          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                          return `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
                        }
                        return baseColor;
                      } else {
                        // Different divisions - grayscale
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
                    <div className="text-gray-700 font-semibold mb-2">
                      All Flows (grayscale with weight-based luminosity):
                    </div>
                    <div className="flex flex-col gap-1">
                      {(() => {
                        const minVal = Math.min(...filteredEdges.map(e => e.value));
                        const maxVal = Math.max(...filteredEdges.map(e => e.value));
                        const range = maxVal - minVal;
                        const lightnessLevels = [85, 70, 55, 40, 25];
                        
                        return lightnessLevels.map((lightness, idx) => {
                          const step = range / lightnessLevels.length;
                          const rangeMin = Math.round(minVal + (idx * step));
                          const rangeMax = Math.round(minVal + ((idx + 1) * step));
                          
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div 
                                className="w-16 h-3 border border-gray-300" 
                                style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)` }}
                              ></div>
                              <span className="text-[10px] text-gray-600">
                                {rangeMin.toLocaleString()} - {rangeMax.toLocaleString()} people
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="text-gray-600 mt-2">
                      Edge width = log-scaled volume
                    </div>
                  </div>
                ) : colorMode === 'region' ? (
                  <div className="space-y-3 text-xs">
                    <div className="text-gray-700 font-semibold">
                      Same-Region Flows (colored by region):
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(REGION_COLORS).map(([region, color]) => {
                        const rgb = hexToRgb(color);
                        const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
                        const minVal = Math.min(...filteredEdges.map(e => e.value));
                        const maxVal = Math.max(...filteredEdges.map(e => e.value));
                        const range = maxVal - minVal;
                        const lightnessLevels = [85, 70, 55, 40, 25];
                        
                        return (
                          <div key={region} className="space-y-1">
                            <div className="font-medium">{region}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-0.5">
                                {hsl && lightnessLevels.map((lightness, idx) => {
                                  // Calculate the value range for this lightness level
                                  const step = range / lightnessLevels.length;
                                  const rangeMin = Math.round(minVal + (idx * step));
                                  const rangeMax = Math.round(minVal + ((idx + 1) * step));
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-1">
                                      <div 
                                        className="w-12 h-2" 
                                        style={{ backgroundColor: `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)` }}
                                      ></div>
                                      <span className="text-[9px] text-gray-600 whitespace-nowrap">
                                        {rangeMin.toLocaleString()}-{rangeMax.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-gray-300">
                      <div className="text-gray-700 font-semibold mb-1">Cross-Region Flows (grayscale):</div>
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const minVal = Math.min(...filteredEdges.map(e => e.value));
                          const maxVal = Math.max(...filteredEdges.map(e => e.value));
                          const range = maxVal - minVal;
                          const lightnessLevels = [85, 55, 25];
                          
                          return lightnessLevels.map((lightness, idx) => {
                            const step = range / lightnessLevels.length;
                            const rangeMin = Math.round(minVal + (idx * step));
                            const rangeMax = Math.round(minVal + ((idx + 1) * step));
                            
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <div 
                                  className="w-12 h-2 border border-gray-300" 
                                  style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)` }}
                                ></div>
                                <span className="text-[9px] text-gray-600 whitespace-nowrap">
                                  {rangeMin.toLocaleString()}-{rangeMax.toLocaleString()}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="text-gray-700 font-semibold">
                      Same-Division Flows (colored by division):
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(DIVISION_COLORS).map(([division, color]) => {
                        const rgb = hexToRgb(color);
                        const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
                        const minVal = Math.min(...filteredEdges.map(e => e.value));
                        const maxVal = Math.max(...filteredEdges.map(e => e.value));
                        const range = maxVal - minVal;
                        const lightnessLevels = [85, 55, 25];
                        
                        return (
                          <div key={division} className="space-y-1">
                            <div className="font-medium text-[10px]">{division}</div>
                            <div className="flex flex-col gap-0.5">
                              {hsl && lightnessLevels.map((lightness, idx) => {
                                // Calculate the value range for this lightness level (3 steps)
                                const step = range / lightnessLevels.length;
                                const rangeMin = Math.round(minVal + (idx * step));
                                const rangeMax = Math.round(minVal + ((idx + 1) * step));
                                
                                return (
                                  <div key={idx} className="flex items-center gap-1">
                                    <div 
                                      className="w-6 h-2" 
                                      style={{ backgroundColor: `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)` }}
                                    ></div>
                                    <span className="text-[8px] text-gray-600 whitespace-nowrap">
                                      {rangeMin > 999 ? `${Math.round(rangeMin/1000)}k` : rangeMin}-{rangeMax > 999 ? `${Math.round(rangeMax/1000)}k` : rangeMax}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-gray-300">
                      <div className="text-gray-700 font-semibold mb-1">Cross-Division Flows (grayscale):</div>
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const minVal = Math.min(...filteredEdges.map(e => e.value));
                          const maxVal = Math.max(...filteredEdges.map(e => e.value));
                          const range = maxVal - minVal;
                          const lightnessLevels = [85, 55, 25];
                          
                          return lightnessLevels.map((lightness, idx) => {
                            const step = range / lightnessLevels.length;
                            const rangeMin = Math.round(minVal + (idx * step));
                            const rangeMax = Math.round(minVal + ((idx + 1) * step));
                            
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <div 
                                  className="w-12 h-2 border border-gray-300" 
                                  style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)` }}
                                ></div>
                                <span className="text-[9px] text-gray-600 whitespace-nowrap">
                                  {rangeMin > 999 ? `${Math.round(rangeMin/1000)}k` : rangeMin}-{rangeMax > 999 ? `${Math.round(rangeMax/1000)}k` : rangeMax}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
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
            <li>• Each state is represented as a node along the baseline</li>
            <li>• Arcs represent migration flows between states in 2021</li>
            <li>• Arc thickness indicates migration volume (log-scaled for visibility)</li>
            <li>• Arc luminosity (darkness) shows migration volume - darker arcs = higher migration</li>
            <li><strong>Color Modes:</strong></li>
            <li className="ml-4">◦ <strong>Grayscale:</strong> All arcs in grayscale with weight-based luminosity</li>
            <li className="ml-4">◦ <strong>Region:</strong> Same-region migrations colored by 4 U.S. regions (Northeast=Blue, Midwest=Amber, South=Red, West=Green)</li>
            <li className="ml-4">◦ <strong>Division:</strong> Same-division migrations colored by 9 U.S. Census divisions for finer granularity</li>
            <li><strong>Node Ordering:</strong></li>
            <li className="ml-4">◦ <strong>Alphabetical:</strong> States sorted A-Z</li>
            <li className="ml-4">◦ <strong>By Region:</strong> States grouped by region (Northeast, Midwest, South, West)</li>
            <li className="ml-4">◦ <strong>By Division:</strong> States grouped by census division (New England, Mid-Atlantic, etc.)</li>
            <li>• Use the min/max threshold sliders to focus on a specific range of migration volumes</li>
            <li>• Adjust max edges to limit visual complexity</li>
            <li>• <strong>Arc Opacity slider:</strong> Control transparency to see overlapping migration patterns (lower = more transparent)</li>
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

