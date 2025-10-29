import { createFileRoute, Link } from '@tanstack/react-router'
import logo from '../logo.svg'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <img
            src={logo}
            className="h-32 mx-auto mb-8 animate-[spin_20s_linear_infinite]"
            alt="Kriskogram Logo"
          />
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Kriskogram
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Dynamic Interactive Network Visualization for Migration Data
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Simple Demo</h2>
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

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Full Demo</h2>
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

            <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">State-to-State Migration (2021)</h2>
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

            <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Sample Datasets</h2>
              <p className="text-gray-600 mb-4">
                Download sample datasets including US State-to-State Migration (2021), 
                Sample Migration (GEXF), and Swiss Relocations (2016) for use with Kriskogram.
              </p>
              <Link
                to="/datasets"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Browse & Download Datasets
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Dynamic Animation</h3>
                <p className="text-sm text-gray-600">Smooth temporal transitions showing migration patterns over time</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Rich Data</h3>
                <p className="text-sm text-gray-600">GEXF format support with economic, geographic, and migration attributes</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Interactive</h3>
                <p className="text-sm text-gray-600">Hover, click, and explore migration patterns with tooltips and highlighting</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Built with React, D3.js, and TanStack Router
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://reactjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                React
              </a>
              <a
                href="https://d3js.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:underline"
              >
                D3.js
              </a>
              <a
                href="https://tanstack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                TanStack
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
