import { useState, useEffect, useRef } from 'react';
import { gexfToKriskogramSnapshots, loadGexfFromUrl, createSampleKriskogramData } from '../lib/gexf-parser';
import Kriskogram from './Kriskogram';
import type { KriskogramRef } from './Kriskogram';

interface KriskogramDemoProps {
  gexfUrl?: string;
}

export function KriskogramDemo({ gexfUrl }: KriskogramDemoProps) {
  const [currentYear, setCurrentYear] = useState(2020);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({ start: 2020, end: 2024 });
  const kriskogramRef = useRef<KriskogramRef>(null);

  useEffect(() => {
    loadData();
  }, [gexfUrl]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let snapshots;
      
      if (gexfUrl) {
        // Load from GEXF file
        const gexfGraph = await loadGexfFromUrl(gexfUrl);
        snapshots = gexfToKriskogramSnapshots(gexfGraph);
        setTimeRange(gexfGraph.timeRange);
      } else {
        // Use sample data
        const sampleData = createSampleKriskogramData();
        snapshots = [{
          nodes: sampleData.nodes,
          edges: sampleData.edges,
          timestamp: 2020,
        }];
        setTimeRange({ start: 2020, end: 2020 });
      }
      
      setSnapshots(snapshots);
      setCurrentYear(timeRange.start);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const currentSnapshot = snapshots.find(s => s.timestamp === currentYear);

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    // Update the kriskogram with new data
    const snapshot = snapshots.find(s => s.timestamp === year);
    if (snapshot && kriskogramRef.current) {
      kriskogramRef.current.updateData(snapshot.nodes, snapshot.edges);
    }
  };

  const playAnimation = () => {
    let year = timeRange.start;
    const interval = setInterval(() => {
      if (year <= timeRange.end) {
        setCurrentYear(year);
        const snapshot = snapshots.find(s => s.timestamp === year);
        if (snapshot && kriskogramRef.current) {
          kriskogramRef.current.updateData(snapshot.nodes, snapshot.edges);
        }
        year++;
      } else {
        clearInterval(interval);
      }
    }, 1000);
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
            <label className="text-sm font-medium">Year:</label>
            <input
              type="range"
              min={timeRange.start}
              max={timeRange.end}
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-mono w-16">{currentYear}</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={playAnimation}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Play Animation
            </button>
            <button
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
                  nodeOrder: (d) => d.id,
                  nodeColor: (d) => {
                    if (d.economic_index) {
                      const hue = d.economic_index * 120; // Green to red scale
                      return `hsl(${hue}, 70%, 50%)`;
                    }
                    return '#555';
                  },
                  nodeRadius: (d) => {
                    if (d.population) {
                      return Math.sqrt(d.population) / 1000;
                    }
                    return 6;
                  },
                  edgeWidth: (e) => Math.sqrt(e.value) / 10,
                  edgeColor: (e, isAbove) => {
                    const colors = {
                      economic: isAbove ? '#1f77b4' : '#d62728',
                      career: isAbove ? '#2ca02c' : '#ff7f0e',
                      lifestyle: isAbove ? '#9467bd' : '#8c564b',
                    };
                    return colors[e.migration_type as keyof typeof colors] || (isAbove ? '#1f77b4' : '#d62728');
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
