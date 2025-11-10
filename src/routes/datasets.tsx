import { createFileRoute, Link } from '@tanstack/react-router'
import { STATE_MIGRATION_CSV_FILES, STATE_MIGRATION_MISSING_YEARS } from '../data/stateMigrationFiles'

export const Route = createFileRoute('/datasets')({
  component: DatasetsPage,
})

interface DatasetFile {
  name: string
  description: string
  filename: string
  url: string
  format: 'CSV' | 'GEXF'
}

interface Dataset {
  title: string
  description: string
  year?: number
  source?: string
  dataLinks?: Array<{ label: string; url: string }>
  files: DatasetFile[]
}

const datasets: Dataset[] = [
  {
    title: 'US State-to-State Migration (ACS 1-Year Series)',
    description: [
      'Tidy CSV exports converted from the U.S. Census Bureau state-to-state migration flow tables. Each file contains row-based estimates and margins of error for a given ACS 1-year release between 2005 and 2023.',
      STATE_MIGRATION_MISSING_YEARS.length
        ? `Note: ${STATE_MIGRATION_MISSING_YEARS.join(', ')} ${STATE_MIGRATION_MISSING_YEARS.length === 1 ? 'is' : 'are'} unavailable because the Census Bureau did not release ACS 1-year migration flows for that year.`
        : undefined,
    ]
      .filter(Boolean)
      .join(' '),
    source: 'U.S. Census Bureau, American Community Survey 1-Year Estimates',
    dataLinks: [
      {
        label: 'State-to-State Migration Flows (census.gov)',
        url: 'https://www.census.gov/data/tables/time-series/demo/geographic-mobility/state-to-state-migration.html',
      },
    ],
    files: STATE_MIGRATION_CSV_FILES.map((file) => ({
      name: file.title,
      description:
        file.description ??
        'Row-based migration flows with 90% margins of error (estimate & MOE columns).',
      filename: file.filename,
      url: `/data/StateToStateMigrationUSCSV/${file.filename}`,
      format: 'CSV',
    })),
  },
  {
    title: 'US State-to-State Migration (2021)',
    description: 'Real U.S. Census Bureau data showing migration flows between all 50 states from the American Community Survey 1-Year Estimates.',
    year: 2021,
    source: 'U.S. Census Bureau, 2021 American Community Survey',
    dataLinks: [
      {
        label: 'U.S. Census Bureau - State-to-State Migration Flows',
        url: 'https://www.census.gov/data/tables/time-series/demo/geographic-mobility/state-to-state-migration.html',
      },
    ],
    files: [
      {
        name: 'State-to-State Migrations Table',
        description: 'Single tidy CSV containing row-based migration estimates (one origin/destination pair per row) with margin-of-error values.',
        filename: 'State_to_State_Migrations_Table_2021.csv',
        url: '/data/State_to_State_Migrations_Table_2021.csv',
        format: 'CSV',
      },
    ],
  },
  {
    title: 'Sample Migration (GEXF)',
    description: 'AI-generated sample network dataset in GEXF format demonstrating temporal migration patterns with multiple time slices. This example dataset includes economic, geographic, and migration type attributes for demonstration purposes.',
    source: 'AI Generated Sample Dataset',
    files: [
      {
        name: 'Sample Migration Data',
        description: 'GEXF file containing sample migration network with temporal snapshots and rich node/edge attributes.',
        filename: 'sample-migration-data.gexf',
        url: '/data/sample-migration-data.gexf',
        format: 'GEXF',
      },
    ],
  },
  {
    title: 'Swiss Relocations (2016)',
    description: 'Relocations between Swiss cantons in 2016. This dataset contains 521,510 trips and uses a two-file CSV format with separate files for locations (cantons) and flows (relocations). Created by Ilya Boyandin.',
    year: 2016,
    source: 'Federal Statistical Office (Switzerland)',
    dataLinks: [
      {
        label: 'Federal Statistical Office - Binnenwanderung',
        url: 'https://www.bfs.admin.ch/bfs/de/home/statistiken/bevoelkerung/migration-integration/binnenwanderung.assetdetail.3222163.html',
      },
      {
        label: 'Flowmap.blue Visualization (by Ilya Boyandin)',
        url: 'https://www.flowmap.blue/15kwLB4baXZ7jpip8q0JjgR6zDoS5Gt3gMLCTUAboQxk?v=46.719075%2C7.817990%2C7.51%2C0%2C0&a=0&as=1&b=1&bo=75&c=0&ca=1&d=1&fe=1&lt=1&lfm=ALL&col=Default&f=45',
      },
    ],
    files: [
      {
        name: 'Locations File',
        description: 'CSV file containing Swiss canton information including ID, name, and coordinates (latitude/longitude).',
        filename: 'Swiss_Relocations_2016_locations.csv',
        url: '/data/Swiss_Relocations_2016_locations.csv',
        format: 'CSV',
      },
      {
        name: 'Flows File',
        description: 'CSV file containing relocation flows between cantons with origin, destination, and count.',
        filename: 'Swiss_Relocations_2016_flows.csv',
        url: '/data/Swiss_Relocations_2016_flows.csv',
        format: 'CSV',
      },
    ],
  },
]

function DatasetsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Datasets
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Download sample datasets for use with Kriskogram
          </p>
        </header>

        <div className="max-w-6xl mx-auto space-y-8">
          {datasets.map((dataset, datasetIdx) => (
            <div
              key={datasetIdx}
              className="bg-white rounded-lg shadow-lg p-6 md:p-8"
            >
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {dataset.title}
                </h2>
                {dataset.year && (
                  <p className="text-sm text-gray-500 mb-2">Year: {dataset.year}</p>
                )}
                {dataset.source && (
                  <p className="text-sm text-gray-500 mb-2">Source: {dataset.source}</p>
                )}
                {dataset.dataLinks && dataset.dataLinks.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Data Sources:</p>
                    <ul className="space-y-1">
                      {dataset.dataLinks.map((link, linkIdx) => (
                        <li key={linkIdx}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-gray-700 leading-relaxed">{dataset.description}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Files ({dataset.files.length})
                </h3>
                {dataset.files.map((file, fileIdx) => (
                  <div
                    key={fileIdx}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-gray-800">
                            {file.name}
                          </h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {file.format}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{file.description}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {file.filename}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={file.url}
                        download={file.filename}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto mt-12 bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Importing Datasets
          </h2>
          <div className="space-y-4 text-gray-700">
            <p>
              After downloading a dataset, you can import it into Kriskogram using the{' '}
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
                  temporalOverlay: false,
                  temporalOverlayEdgeStyle: 'filled',
                  temporalOverlayNodeStyle: 'filled',
                  edgeSegmentLength: 8,
                  edgeSegmentGap: 4,
                  edgeSegmentOffset: 0,
                  edgeSegmentCap: 'round',
                  edgeSegmentAnimate: false,
                  edgeOutlineThickness: 3,
                  edgeOutlineGap: 2,
                  temporalOverlayYears: 1,
                  edgeWeightScale: 'linear',
                }}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Explorer page
              </Link>
              .
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Import Instructions:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <strong>Single CSV files:</strong> Use the Import button and select the CSV file.
                  The system will automatically detect the format (state-to-state migration).
                </li>
                <li>
                  <strong>Two-file CSV datasets (Swiss Relocations):</strong> Select both the locations
                  and flows files together when importing. The import panel will guide you through
                  mapping the fields.
                </li>
                <li>
                  <strong>GEXF files:</strong> Import directly - GEXF format includes all structure
                  and temporal information automatically.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 text-center">
          <Link
            to="/explorer"
            search={{
              dataset: undefined,
              view: 'kriskogram' as const,
              year: undefined as number | undefined,
              minThreshold: 0,
              maxThreshold: 200000,
              maxEdges: 500,
              showAllNodes: false,
              egoNodeId: null,
              egoNeighborSteps: 1,
              egoStepColoring: false,
              temporalOverlay: false,
              temporalOverlayEdgeStyle: 'filled',
              temporalOverlayNodeStyle: 'filled',
              edgeSegmentLength: 8,
              edgeSegmentGap: 4,
              edgeSegmentOffset: 0,
              edgeSegmentCap: 'round',
              edgeSegmentAnimate: false,
              edgeOutlineThickness: 3,
              edgeOutlineGap: 2,
              temporalOverlayYears: 1,
              edgeType: null,
              edgeWeightScale: 'linear',
            }}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Explorer
          </Link>
        </div>
      </div>
    </div>
  )
}
