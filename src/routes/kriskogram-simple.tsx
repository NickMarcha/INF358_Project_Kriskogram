import { createFileRoute } from '@tanstack/react-router';
import Kriskogram from '../components/Kriskogram';

function SimpleKriskogramDemo() {
  const sampleNodes = [
    { id: "A", label: "Alpha", population: 1000000, economic_index: 0.9 },
    { id: "B", label: "Beta", population: 800000, economic_index: 0.7 },
    { id: "C", label: "Gamma", population: 600000, economic_index: 0.5 },
    { id: "D", label: "Delta", population: 400000, economic_index: 0.3 },
  ];

  const sampleEdges = [
    { source: "A", target: "B", value: 10000, migration_type: "economic" },
    { source: "B", target: "D", value: 6000, migration_type: "career" },
    { source: "C", target: "A", value: 4000, migration_type: "lifestyle" },
    { source: "D", target: "C", value: 8000, migration_type: "economic" },
  ];

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">Simple Kriskogram Demo</h1>
        
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Features:</h2>
          <ul className="text-sm space-y-1">
            <li>• Nodes colored by economic index (green = high, red = low)</li>
            <li>• Node size based on population</li>
            <li>• Edge width based on migration value</li>
            <li>• Edge colors by migration type</li>
            <li>• Hover over edges for details</li>
            <li>• Click nodes to highlight connections</li>
          </ul>
        </div>

        <Kriskogram
          nodes={sampleNodes}
          edges={sampleEdges}
          width={800}
          height={400}
          margin={{ top: 60, right: 40, bottom: 60, left: 40 }}
          accessors={{
            nodeOrder: (d: any) => d.id,
            nodeColor: (d: any) => {
              const hue = (d.economic_index || 0.5) * 120;
              return `hsl(${hue}, 70%, 50%)`;
            },
            nodeRadius: (d: any) => Math.sqrt(d.population || 100000) / 200,
            edgeWidth: (e: any) => Math.sqrt(e.value) / 20,
            edgeColor: (e: any, isAbove: boolean) => {
              const colors = {
                economic: isAbove ? '#1f77b4' : '#d62728',
                career: isAbove ? '#2ca02c' : '#ff7f0e',
                lifestyle: isAbove ? '#9467bd' : '#8c564b',
              };
              return colors[e.migration_type as keyof typeof colors] || (isAbove ? '#1f77b4' : '#d62728');
            },
          }}
        />

        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">Legend</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>Node Colors:</strong>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>High Economic Index</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Low Economic Index</span>
              </div>
            </div>
            <div>
              <strong>Edge Colors:</strong>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-1 bg-blue-500"></div>
                  <span>Economic Migration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-1 bg-green-500"></div>
                  <span>Career Migration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-1 bg-purple-500"></div>
                  <span>Lifestyle Migration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/kriskogram-simple')({
  component: SimpleKriskogramDemo,
});