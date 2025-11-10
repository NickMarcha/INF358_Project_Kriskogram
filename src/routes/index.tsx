import { createFileRoute, Link } from '@tanstack/react-router'
import { Globe, Info, Network } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Kriskogram
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Dynamic Interactive Network Visualization for Migration Data
          </p>
        </header>

        <div className="max-w-5xl mx-auto">
          {/* Explore + Patterns Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10">
            <Link
              to="/explorer"
              search={{
                view: 'kriskogram' as const,
                year: undefined as number | undefined,
                minThreshold: 0,
                maxThreshold: 200000,
                maxEdges: 500,
                showAllNodes: false,
                egoNodeId: null,
                egoNeighborSteps: 1,
              egoStepColoring: false,
                edgeWeightScale: 'linear',
              }}
              className="explore-button relative inline-flex items-center gap-3 text-white text-lg md:text-xl font-bold px-10 md:px-12 py-5 md:py-6 rounded-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #6366f1 100%)',
                backgroundSize: '200% 200%',
              }}
            >
              <style>{`
                @keyframes gradient-shift {
                  0%, 100% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                }
                @keyframes bounce-subtle {
                  0%, 100% { transform: translateY(0px); }
                  20% { transform: translateY(-6px); }
                  40% { transform: translateY(-3px); }
                  60% { transform: translateY(-7px); }
                  80% { transform: translateY(-2px); }
                }
                .explore-button { animation: gradient-shift 4s ease infinite, bounce-subtle 3s ease-in-out infinite; }
                .explore-button:hover { animation: gradient-shift 2s ease infinite, none; transform: scale(1.05) translateY(0) !important; }
              `}</style>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Globe className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
              <span className="relative z-10">Explore Interactive Kriskograms</span>
            </Link>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-patterns'))}
              className="patterns-button relative inline-flex items-center gap-3 text-white text-lg md:text-xl font-bold px-10 md:px-12 py-5 md:py-6 rounded-xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #8b5cf6 100%)',
                backgroundSize: '200% 200%',
              }}
              type="button"
            >
              <style>{`
                @keyframes gradient-shift-2 {
                  0%, 100% { background-position: 100% 50%; }
                  50% { background-position: 0% 50%; }
                }
                .patterns-button { animation: gradient-shift-2 5s ease infinite, bounce-subtle 4s ease-in-out infinite; }
                .patterns-button:hover { animation: gradient-shift-2 2s ease infinite, none; transform: scale(1.05) translateY(0) !important; }
              `}</style>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:-translate-x-0 transition-transform duration-1000" />
              <Network className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
              <span className="relative z-10">Patterns in Kriskograms</span>
            </button>
          </div>

          {/* About Section moved up */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-800">About</h2>
            </div>
            <p className="text-gray-600">
              Learn more about Kriskogram, its features, architecture, and how to use it.
            </p>
            <div className="mt-4">
              <Link
                to="/about"
                className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Datasets Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">About the Datasets</h2>
            <p className="text-gray-600 mb-4">
              This project sources data from various public datasets including US State-to-State Migration (2021), 
              Sample Migration (GEXF), and Swiss Relocations (2016). Learn more about these datasets, their sources, 
              and download them for use with Kriskogram.
            </p>
            <Link
              to="/datasets"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Browse & Download Datasets
            </Link>
          </div>

          {/* Demo Prototypes */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Demo Prototypes</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xl">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-800">Simple Demo</h3>
                    <p className="text-gray-600 mb-4">
                      A basic Kriskogram showing migration flows between cities with interactive features.
                    </p>
                    <Link
                      to="/kriskogram-simple"
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Simple Demo
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xl">2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-800">Full Demo</h3>
                    <p className="text-gray-600 mb-4">
                      Complete demo with GEXF data loading, temporal animation, and rich migration data.
                    </p>
                    <Link
                      to="/kriskogram"
                      className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View Full Demo
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-xl">3</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-800">State Migration Demo</h3>
                    <p className="text-gray-600 mb-4">
                      Real U.S. Census Bureau data showing migration flows between all 50 states. 
                      Explore over 2,500 migration patterns with interactive filtering and visual analysis.
                    </p>
                    <Link
                      to="/state-migration"
                      className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      View State Migration Data
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  )
}
