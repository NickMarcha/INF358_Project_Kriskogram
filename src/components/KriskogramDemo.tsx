import { useState, useEffect, useRef } from 'react';
import {
  gexfToKriskogramSnapshots,
  loadGexfFromUrl,
  createSampleKriskogramData,
  type KriskogramSnapshot,
} from '../lib/gexf-parser';
import Kriskogram from './Kriskogram';
import type { KriskogramRef } from './Kriskogram';
import type { Node as KriskogramNode, Edge as KriskogramEdge } from '../lib/kriskogram';

interface KriskogramDemoProps {
  gexfUrl?: string;
}

export function KriskogramDemo({ gexfUrl }: KriskogramDemoProps) {
  const [currentYear, setCurrentYear] = useState(2020);
  const [snapshots, setSnapshots] = useState<KriskogramSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>({ start: 2020, end: 2024 });
  const kriskogramRef = useRef<KriskogramRef>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let nextSnapshots: KriskogramSnapshot[];
        let nextTimeRange: { start: number; end: number };

        if (gexfUrl) {
          const gexfGraph = await loadGexfFromUrl(gexfUrl);
          nextSnapshots = gexfToKriskogramSnapshots(gexfGraph);
          nextTimeRange = gexfGraph.timeRange;
        } else {
          const sampleData = createSampleKriskogramData();
          const defaultYear = 2020;
          nextSnapshots = [
            {
              nodes: sampleData.nodes,
              edges: sampleData.edges,
              timestamp: defaultYear,
            },
          ];
          nextTimeRange = { start: defaultYear, end: defaultYear };
        }

        if (isMounted) {
          setSnapshots(nextSnapshots);
          setTimeRange(nextTimeRange);
          setCurrentYear(nextTimeRange.start);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [gexfUrl]);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        window.clearInterval(animationRef.current);
      }
    };
  }, []);

  const currentSnapshot = snapshots.find((snapshot) => snapshot.timestamp === currentYear);

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    // Update the kriskogram with new data
    const snapshot = snapshots.find((snapshot) => snapshot.timestamp === year);
    if (snapshot && kriskogramRef.current) {
      kriskogramRef.current.updateData(snapshot.nodes, snapshot.edges);
    }
  };

  const playAnimation = () => {
    if (animationRef.current !== null) {
      window.clearInterval(animationRef.current);
      animationRef.current = null;
    }
    let year = timeRange.start;
    const intervalId = window.setInterval(() => {
      if (year <= timeRange.end) {
        setCurrentYear(year);
        const snapshot = snapshots.find((snapshot) => snapshot.timestamp === year);
        if (snapshot && kriskogramRef.current) {
          kriskogramRef.current.updateData(snapshot.nodes, snapshot.edges);
        }
        year++;
      } else {
        if (animationRef.current !== null) {
          window.clearInterval(animationRef.current);
          animationRef.current = null;
        }
      }
    }, 1000);
    animationRef.current = intervalId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading GEXF data...</div>
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

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Kriskogram Demo</h2>
        
        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium" htmlFor="kriskogram-year-slider">Year:</label>
            <input
              type="range"
              min={timeRange.start}
              max={timeRange.end}
              value={currentYear}
              id="kriskogram-year-slider"
              onChange={(e) => handleYearChange(Number.parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <span className="text-lg font-mono w-16">{currentYear}</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={playAnimation}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Play Animation
            </button>
            <button
              type="button"
              onClick={() => setCurrentYear(timeRange.start)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Data Summary */}
        {currentSnapshot && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Current Snapshot ({currentYear})</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nodes:</span> {currentSnapshot.nodes.length}
              </div>
              <div>
                <span className="font-medium">Edges:</span> {currentSnapshot.edges.length}
              </div>
            </div>
          </div>
        )}

        {/* Kriskogram Visualization */}
        <div className="border-2 border-gray-200 rounded-lg p-4">
          {currentSnapshot ? (
            <div>
              <Kriskogram
                ref={kriskogramRef}
                nodes={currentSnapshot.nodes}
                edges={currentSnapshot.edges}
                width={1000}
                height={600}
                margin={{ top: 60, right: 40, bottom: 60, left: 40 }}
                accessors={{
                  nodeOrder: (node: KriskogramNode) => node.id,
                  nodeColor: (node: KriskogramNode) => {
                    if (typeof node.economic_index === 'number') {
                      const clampedIndex = Math.max(0, Math.min(1, node.economic_index));
                      const hue = clampedIndex * 120; // Green to red scale
                      return `hsl(${hue}, 70%, 50%)`;
                    }
                    return '#555';
                  },
                  nodeRadius: (node: KriskogramNode) => {
                    if (typeof node.population === 'number' && Number.isFinite(node.population)) {
                      return Math.sqrt(Math.max(0, node.population)) / 1000;
                    }
                    return 6;
                  },
                  edgeWidth: (edge: KriskogramEdge) => Math.sqrt(edge.value) / 10,
                  edgeColor: (edge: KriskogramEdge, _isAbove: boolean) => {
                    // Find min and max weights for color scaling
                    const weights = currentSnapshot.edges.map((edgeValue) => edgeValue.value);
                    if (weights.length === 0) {
                      return 'hsl(200, 70%, 50%)';
                    }
                    const minWeight = Math.min(...weights);
                    const maxWeight = Math.max(...weights);
                    
                    // Normalize weight to 0-1 range
                    const range = maxWeight - minWeight || 1;
                    const normalized = (edge.value - minWeight) / range;
                    
                    // Use single hue (light blue) with varying lightness
                    // Low weight = lighter, high weight = darker
                    const hue = 200; // Light blue
                    const saturation = 70; // Constant saturation
                    const lightness = 75 - (normalized * 50); // 75% (light) to 25% (dark)
                    
                    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                  },
                }}
              />
              
              {/* Debug info */}
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium">Debug Data</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(currentSnapshot, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No data available for year {currentYear}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">Usage Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use the slider to navigate through different years</li>
            <li>• Click "Play Animation" to see the temporal changes</li>
            <li>• The data includes migration flows between major US cities</li>
            <li>• Each edge represents migration volume and includes attributes like distance and economic factors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default KriskogramDemo;
