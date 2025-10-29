import { useState, useRef } from 'react'
import type { StoredDataset } from '../lib/storage'

interface ImportPanelProps {
  onClose: () => void
  onImport: (dataset: Omit<StoredDataset, 'id' | 'createdAt'>) => Promise<void>
  fileName: string
  fileType: 'csv' | 'gexf'
  fileContent: string
  parsedData?: {
    nodes: any[]
    edges: any[]
    timeRange?: { start: number; end: number }
  }
}

/**
 * Data Format Documentation
 */
const DATA_FORMAT_INFO = {
  csv: {
    title: 'CSV Format (State Migration Data)',
    description: 'CSV files should follow the U.S. Census Bureau state-to-state migration format.',
    structure: [
      '**Header rows**: First 3 lines contain metadata and column headers',
      '**Data rows**: Starting from line 4, each row represents a source state',
      '**Columns**: Source state, followed by estimate/MOE pairs for each destination state',
      '**Node properties**: Automatically extracted (id, label, region, division)',
      '**Edge properties**: Value (migration count), optional MOE (margin of error)',
    ],
    example: `Example structure:
Source State | ... | CA (est) | CA (MOE) | TX (est) | TX (MOE) | ...
California   | ... |    N/A    |   +/-0   |   12500  |  +/-500  | ...
Texas        | ... |   8900    |  +/-400  |    N/A   |   +/-0   | ...`,
    requiredFields: [
      'Source state column (first column)',
      'Destination state columns as Estimate/MOE pairs',
    ],
    limitations: [
      'Single timestamp/snapshot (no temporal data)',
      'Bidirectional flows handled automatically',
      'Only supports U.S. state-level data currently',
    ],
  },
  gexf: {
    title: 'GEXF Format (Graph Exchange XML Format)',
    description: 'GEXF is an XML-based format for storing graph data with temporal information.',
    structure: [
      '**Graph structure**: <graph> element contains nodes and edges',
      '**Nodes**: <node> elements with id, label, and optional attributes',
      '**Edges**: <edge> elements with source, target, weight, and attributes',
      '**Attributes**: Defined in <attributes> section, applied via <attvalue> elements',
      '**Temporal data**: <spells> elements define when nodes/edges are active',
    ],
    example: `<graph mode="dynamic">
  <attributes class="node">
    <attribute id="0" title="region" type="string"/>
    <attribute id="1" title="population" type="integer"/>
  </attributes>
  <attributes class="edge">
    <attribute id="0" title="migration_type" type="string"/>
  </attributes>
  <nodes>
    <node id="NYC" label="New York City">
      <attvalues>
        <attvalue for="0" value="Northeast"/>
      </attvalues>
      <spells>
        <spell start="2020" end="2024"/>
      </spells>
    </node>
  </nodes>
  <edges>
    <edge id="e1" source="NYC" target="LA" weight="12500">
      <attvalues>
        <attvalue for="0" value="economic"/>
      </attvalues>
      <spells>
        <spell start="2020" end="2020"/>
      </spells>
    </edge>
  </edges>
</graph>`,
    requiredFields: [
      'Graph mode (static or dynamic)',
      'Node id and label',
      'Edge source, target, and weight',
    ],
    supportedFeatures: [
      'Temporal/spatial data via spells',
      'Custom node and edge attributes',
      'Multiple time snapshots',
      'Edge types via attributes (e.g., migration_type: career, economic, lifestyle)',
    ],
  },
}

export default function ImportPanel({
  onClose,
  onImport,
  fileName,
  fileType,
  fileContent,
  parsedData,
}: ImportPanelProps) {
  const [datasetName, setDatasetName] = useState(fileName.replace(/\.(csv|gexf)$/i, ''))
  const [notes, setNotes] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showFormatInfo, setShowFormatInfo] = useState(false)

  const formatInfo = DATA_FORMAT_INFO[fileType]

  function validate(): string[] {
    const errors: string[] = []

    if (!datasetName.trim()) {
      errors.push('Dataset name is required')
    }

    if (!parsedData) {
      errors.push('Data parsing failed - please check file format')
      return errors
    }

    if (parsedData.nodes.length === 0) {
      errors.push('No nodes found in dataset')
    }

    if (parsedData.edges.length === 0) {
      errors.push('No edges found in dataset')
    }

    // Check for unique node IDs
    const nodeIds = new Set(parsedData.nodes.map(n => n.id))
    if (nodeIds.size !== parsedData.nodes.length) {
      errors.push('Duplicate node IDs found')
    }

    // Check edge references
    const invalidEdges = parsedData.edges.filter(
      e => !nodeIds.has(e.source) || !nodeIds.has(e.target)
    )
    if (invalidEdges.length > 0) {
      errors.push(`${invalidEdges.length} edges reference non-existent nodes`)
    }

    return errors
  }

  async function handleImport() {
    const errors = validate()
    setValidationErrors(errors)

    if (errors.length > 0 || !parsedData) {
      return
    }

    setIsImporting(true)
    try {
      // Prepare dataset (caller will add id and createdAt)
      const timeRange = parsedData.timeRange || { start: 2021, end: 2021 }
      
      const dataset: Omit<StoredDataset, 'id' | 'createdAt'> = {
        name: datasetName.trim(),
        description: notes.trim() || undefined,
        filename: fileName,
        notes: notes.trim() || undefined,
        type: fileType,
        timeRange,
        snapshots: parsedData.timeRange && parsedData.timeRange.start !== parsedData.timeRange.end
          ? // Multi-snapshot data would need to be prepared differently
            [{ timestamp: timeRange.start, nodes: parsedData.nodes, edges: parsedData.edges }]
          : [{ timestamp: timeRange.start, nodes: parsedData.nodes, edges: parsedData.edges }],
        metadata: undefined, // Will be set by caller after detection
      }

      await onImport(dataset)
    } catch (error) {
      setValidationErrors([
        error instanceof Error ? error.message : 'Failed to import dataset',
      ])
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Import Dataset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* File Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {fileName} ({fileType.toUpperCase()})
              </div>
            </div>

            {/* Dataset Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dataset Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a name for this dataset"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes about this dataset..."
              />
            </div>

            {/* Data Preview */}
            {parsedData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Preview
                </label>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Nodes:</span> {parsedData.nodes.length}
                    </div>
                    <div>
                      <span className="font-medium">Edges:</span> {parsedData.edges.length}
                    </div>
                    {parsedData.timeRange && (
                      <div className="col-span-2">
                        <span className="font-medium">Time Range:</span>{' '}
                        {parsedData.timeRange.start}
                        {parsedData.timeRange.end !== parsedData.timeRange.start
                          ? ` – ${parsedData.timeRange.end}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Format Information */}
            <div>
              <button
                onClick={() => setShowFormatInfo(!showFormatInfo)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <span>
                  {showFormatInfo ? 'Hide' : 'Show'} {formatInfo.title} Info
                </span>
                <span>{showFormatInfo ? '▼' : '▶'}</span>
              </button>
              {showFormatInfo && (
                <div className="mt-2 p-4 bg-blue-50 rounded border border-blue-200 text-sm space-y-3">
                  <p className="text-gray-700">{formatInfo.description}</p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Structure:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                      {formatInfo.structure.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                      ))}
                    </ul>
                  </div>

                  {formatInfo.example && (
                    <div>
                      <h4 className="font-semibold mb-2">Example:</h4>
                      <pre className="bg-white p-3 rounded text-xs overflow-x-auto border">
                        {formatInfo.example}
                      </pre>
                    </div>
                  )}

                  {formatInfo.requiredFields && (
                    <div>
                      <h4 className="font-semibold mb-2">Required Fields:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                        {formatInfo.requiredFields.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(formatInfo.limitations || formatInfo.supportedFeatures) && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        {formatInfo.limitations ? 'Limitations' : 'Supported Features'}:
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                        {(formatInfo.limitations || formatInfo.supportedFeatures)?.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-800 mb-2">Validation Errors:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || validationErrors.length > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : 'Import Dataset'}
          </button>
        </div>
      </div>
    </div>
  )
}

