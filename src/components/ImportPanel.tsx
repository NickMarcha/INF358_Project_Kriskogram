import { useState, useRef, useEffect } from 'react'
import { detectDatasetProperties } from '../lib/storage'
import type { StoredDataset } from '../lib/storage'
import { parseStateMigrationCSV } from '../lib/csv-parser'
import { parseGexf, gexfToKriskogramSnapshots } from '../lib/gexf-parser'
import { parseTwoFileCSV } from '../lib/csv-two-file-parser'

interface ImportPanelProps {
  onClose: () => void
  onImport: (
    dataset: Omit<StoredDataset, 'id' | 'createdAt'>,
    parsedResult: { nodes: any[]; edges: any[]; snapshots: any[]; metadata?: any }
  ) => Promise<void>
  fileInputRef: React.RefObject<HTMLInputElement>
  onFilesSelected: (files: {
    files: File[]
    contents: string[]
    type: 'csv' | 'gexf' | 'csv-two-file'
    parsedData?: { nodes: any[]; edges: any[]; timeRange?: { start: number; end: number } }
  } | null) => void
  existingFile: {
    files: File[]
    contents: string[]
    type: 'csv' | 'gexf' | 'csv-two-file'
    parsedData?: { nodes: any[]; edges: any[]; timeRange?: { start: number; end: number } }
  } | null
}

type ImportMode = 'single' | 'two-file'
type FileType = 'csv' | 'gexf'

export default function ImportPanel({
  onClose,
  onImport,
  fileInputRef,
  onFilesSelected,
  existingFile,
}: ImportPanelProps) {
  const [datasetName, setDatasetName] = useState('')
  const [notes, setNotes] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showFormatInfo, setShowFormatInfo] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileContents, setFileContents] = useState<string[]>([])
  const [fileType, setFileType] = useState<FileType | null>(null)
  
  // Refs for scrolling to errors
  const nameInputRef = useRef<HTMLInputElement>(null)
  const errorsSummaryRef = useRef<HTMLDivElement>(null)

  // Two-file CSV configuration
  const [nodesFileIndex, setNodesFileIndex] = useState<number | null>(null)
  const [edgesFileIndex, setEdgesFileIndex] = useState<number | null>(null)
  const [nodesHeaders, setNodesHeaders] = useState<string[]>([])
  const [edgesHeaders, setEdgesHeaders] = useState<string[]>([])
  const [nodeIdField, setNodeIdField] = useState<string>('')
  const [nodeLabelField, setNodeLabelField] = useState<string>('')
  const [edgeSourceField, setEdgeSourceField] = useState<string>('')
  const [edgeTargetField, setEdgeTargetField] = useState<string>('')
  const [edgeValueField, setEdgeValueField] = useState<string>('')

  const [parsedData, setParsedData] = useState<{
    nodes: any[]
    edges: any[]
    timeRange?: { start: number; end: number }
  } | null>(null)

  // Auto-generate title from filename
  function generateTitleFromFilename(filename: string): string {
    // Remove extension
    let name = filename.replace(/\.(csv|gexf)$/i, '')
    // Split on special characters, casing, or spaces
    name = name
      .replace(/([a-z])([A-Z])/g, '$1 $2') // CamelCase -> Camel Case
      .replace(/[_-]/g, ' ') // Underscores and dashes to spaces
      .replace(/[^a-zA-Z0-9\s]/g, ' ') // Other special chars to spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim()
    // Capitalize first letter of each word
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  useEffect(() => {
    if (existingFile?.parsedData) {
      setParsedData(existingFile.parsedData)
      const firstFileName = existingFile.files[0]?.name || ''
      setDatasetName(generateTitleFromFilename(firstFileName))
      setNotes(existingFile.files.map(f => f.name).join(', '))
    }
  }, [existingFile])

  // Auto-fill title and notes when files are selected (but not when editing existing)
  useEffect(() => {
    if (!existingFile && selectedFiles.length > 0) {
      // Only auto-fill if name is empty or just the generated one
      if (!datasetName || datasetName === generateTitleFromFilename(selectedFiles[0]?.name || '')) {
        const firstFileName = selectedFiles[0].name
        setDatasetName(generateTitleFromFilename(firstFileName))
      }
      // Only auto-fill notes if empty
      if (!notes) {
        setNotes(selectedFiles.map(f => f.name).join(', '))
      }
    }
  }, [selectedFiles])

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)

    return result
  }

  function parseCSVHeaders(content: string): string[] {
    const lines = content.trim().split('\n')
    if (lines.length === 0) return []
    const firstLine = lines[0]
    // Use proper CSV line parsing to handle quotes correctly
    return parseCSVLine(firstLine).map(h => h.trim().replace(/^"|"$/g, ''))
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setSelectedFiles(files)
    
    // Read file contents
    const contents = await Promise.all(files.map(f => f.text()))
    setFileContents(contents)

    // Determine file type and mode
    const firstFileName = files[0].name.toLowerCase()
    
    if (firstFileName.endsWith('.gexf')) {
      setFileType('gexf')
      setImportMode('single')
      
      // Parse GEXF immediately
      try {
        const graph = parseGexf(contents[0])
        const snaps = gexfToKriskogramSnapshots(graph)
        setParsedData({
          nodes: snaps.length > 0 ? snaps[0].nodes : [],
          edges: snaps.length > 0 ? snaps[0].edges : [],
          timeRange: graph.timeRange,
        })
        setDatasetName(files[0].name.replace('.gexf', ''))
      } catch (error) {
        setValidationErrors({
          general: error instanceof Error ? error.message : 'Failed to parse GEXF',
        })
      }
    } else if (firstFileName.endsWith('.csv')) {
      setFileType('csv')
      
      if (files.length === 1) {
        // Single CSV file - try to parse as state migration format
        setImportMode('single')
        try {
          const parsed = parseStateMigrationCSV(contents[0])
          setParsedData({
            nodes: parsed.nodes as any[],
            edges: parsed.edges as any[],
            timeRange: { start: 2021, end: 2021 },
          })
          setDatasetName(files[0].name.replace('.csv', ''))
        } catch (error) {
          // If state migration parsing fails, assume it needs two-file format
          setImportMode('two-file')
          const headers = parseCSVHeaders(contents[0])
          setNodesHeaders(headers)
          setEdgesHeaders(headers)
          setNodesFileIndex(0)
          
          // Auto-detect common field names
          const idField = headers.find(h => h.toLowerCase() === 'id' || h.toLowerCase() === 'node' || h.toLowerCase() === 'name')
          const sourceField = headers.find(h => h.toLowerCase() === 'source' || h.toLowerCase() === 'origin' || h.toLowerCase() === 'from')
          const targetField = headers.find(h => h.toLowerCase() === 'target' || h.toLowerCase() === 'dest' || h.toLowerCase() === 'destination' || h.toLowerCase() === 'to')
          const valueField = headers.find(h => h.toLowerCase() === 'value' || h.toLowerCase() === 'count' || h.toLowerCase() === 'weight')
          
          if (idField) setNodeIdField(idField)
          if (sourceField) setEdgeSourceField(sourceField)
          if (targetField) setEdgeTargetField(targetField)
          if (valueField) setEdgeValueField(valueField)
          
          setValidationErrors({
            general:
              'Could not parse as state migration format. Please select which file contains nodes and which contains edges.',
          })
        }
      } else if (files.length === 2) {
        // Two CSV files
        setImportMode('two-file')
        const headers1 = parseCSVHeaders(contents[0])
        const headers2 = parseCSVHeaders(contents[1])
        setNodesHeaders(headers1)
        setEdgesHeaders(headers2)
        setNodesFileIndex(0)
        setEdgesFileIndex(1)
        
        // Auto-detect fields from first file (assume nodes)
        const idField = headers1.find(h => h.toLowerCase() === 'id')
        const nameField = headers1.find(h => h.toLowerCase() === 'name' || h.toLowerCase() === 'label')
        if (idField) setNodeIdField(idField)
        if (nameField) setNodeLabelField(nameField)
        
        // Auto-detect fields from second file (assume edges)
        const sourceField = headers2.find(h => h.toLowerCase() === 'source' || h.toLowerCase() === 'origin' || h.toLowerCase() === 'from')
        const targetField = headers2.find(h => h.toLowerCase() === 'target' || h.toLowerCase() === 'dest' || h.toLowerCase() === 'destination' || h.toLowerCase() === 'to')
        const valueField = headers2.find(h => h.toLowerCase() === 'value' || h.toLowerCase() === 'count' || h.toLowerCase() === 'weight')
        
        if (sourceField) setEdgeSourceField(sourceField)
        if (targetField) setEdgeTargetField(targetField)
        if (valueField) setEdgeValueField(valueField)
        
        // Try to parse with detected fields
        tryParseTwoFile()
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function tryParseTwoFile() {
    if (nodesFileIndex === null || edgesFileIndex === null ||
        !nodeIdField || !edgeSourceField || !edgeTargetField || !edgeValueField) {
      setValidationErrors({
        general: 'Please select all required fields',
      })
      setParsedData(null)
      return
    }

    try {
      const result = parseTwoFileCSV({
        nodesFile: {
          content: fileContents[nodesFileIndex],
          idField: nodeIdField,
          labelField: nodeLabelField || nodeIdField,
        },
        edgesFile: {
          content: fileContents[edgesFileIndex],
          sourceField: edgeSourceField,
          targetField: edgeTargetField,
          valueField: edgeValueField,
        },
      })

      setParsedData({
        nodes: result.nodes,
        edges: result.edges,
        timeRange: { start: 2016, end: 2016 }, // Default, could be made configurable
      })
      setValidationErrors({})
    } catch (error) {
      setValidationErrors({
        general: error instanceof Error ? error.message : 'Failed to parse two-file CSV',
      })
      setParsedData(null)
    }
  }

  useEffect(() => {
    if (importMode === 'two-file' && nodesFileIndex !== null && edgesFileIndex !== null) {
      tryParseTwoFile()
    }
  }, [nodeIdField, nodeLabelField, edgeSourceField, edgeTargetField, edgeValueField, nodesFileIndex, edgesFileIndex])

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {}
    const summary: string[] = []

    if (!datasetName.trim()) {
      errors.name = 'Dataset name is required'
    }

    if (importMode === 'two-file') {
      if (nodesFileIndex === null) {
        errors.nodesFile = 'Please select which file contains nodes'
      }
      if (edgesFileIndex === null) {
        errors.edgesFile = 'Please select which file contains edges'
      }
      if (nodesFileIndex !== null && !nodeIdField) {
        errors.nodeIdField = 'Please select the ID field for nodes'
      }
      if (edgesFileIndex !== null && !edgeSourceField) {
        errors.edgeSourceField = 'Please select the source field for edges'
      }
      if (edgesFileIndex !== null && !edgeTargetField) {
        errors.edgeTargetField = 'Please select the target field for edges'
      }
      if (edgesFileIndex !== null && !edgeValueField) {
        errors.edgeValueField = 'Please select the value field for edges'
      }
    }

    if (!parsedData) {
      errors.general = 'Data parsing failed - please check file format and field selections'
      return errors
    }

    if (parsedData.nodes.length === 0) {
      summary.push('No nodes found in dataset')
    }

    if (parsedData.edges.length === 0) {
      summary.push('No edges found in dataset')
    }

    // Check for unique node IDs
    const nodeIds = new Set(parsedData.nodes.map(n => n.id))
    if (nodeIds.size !== parsedData.nodes.length) {
      summary.push(`${parsedData.nodes.length - nodeIds.size} duplicate node IDs found`)
    }

    // Check edge references
    const invalidEdges = parsedData.edges.filter(
      e => !nodeIds.has(e.source) || !nodeIds.has(e.target)
    )
    if (invalidEdges.length > 0) {
      summary.push(`${invalidEdges.length} edges reference non-existent nodes`)
    }

    // Store summary separately
    if (summary.length > 0) {
      errors.summary = summary.join('; ')
    }

    return errors
  }

  function scrollToError() {
    // Scroll to first error field or summary
    if (validationErrors.name && nameInputRef.current) {
      nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nameInputRef.current.focus()
    } else if (validationErrors.summary && errorsSummaryRef.current) {
      errorsSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  async function handleImport() {
    const errors = validate()
    setValidationErrors(errors)

    // Don't proceed if there are blocking errors (not just summary)
    const blockingErrors = Object.keys(errors).filter(k => k !== 'summary')
    if (blockingErrors.length > 0 || !parsedData) {
      // Scroll to first error after a short delay
      setTimeout(() => scrollToError(), 100)
      return
    }

    setIsImporting(true)
    try {
      const timeRange = parsedData.timeRange || { start: 2021, end: 2021 }
      const snapshot = {
        timestamp: timeRange.start,
        nodes: parsedData.nodes,
        edges: parsedData.edges,
      }
      const metadata = detectDatasetProperties(snapshot)
      const snapshots = [snapshot]

      const dataset: Omit<StoredDataset, 'id' | 'createdAt'> = {
        name: datasetName.trim(),
        filename: selectedFiles.map(f => f.name).join(', '),
        notes: notes.trim() || undefined,
        type: importMode === 'two-file' ? 'csv' : (fileType || 'csv'),
        timeRange,
        snapshots: snapshots as any,
        metadata,
      }

      await onImport(dataset, {
        nodes: parsedData.nodes,
        edges: parsedData.edges,
        snapshots,
        metadata,
      })
    } catch (error) {
      console.error('Import error:', error)
      setValidationErrors({
        general: error instanceof Error ? error.message : 'Failed to import dataset',
      })
      setIsImporting(false)
      setTimeout(() => scrollToError(), 100)
    }
  }

  const formatInfo = fileType ? (fileType === 'gexf' ? {
    title: 'GEXF Format',
    description: 'Graph Exchange XML Format - supports nodes, edges, attributes, and temporal data.',
  } : {
    title: 'CSV Format',
    description: importMode === 'two-file' 
      ? 'Two CSV files: one for nodes (locations) and one for edges (flows). Select which file is which and map the fields.'
      : 'Single CSV file with state-to-state migration data format.',
  }) : null

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
            {/* File Selection */}
            {!importMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Files <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Choose Files
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Select 1 file (GEXF or CSV) or 2 files (CSV nodes + CSV edges)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.gexf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Files
                </label>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <span className="text-sm">{file.name}</span>
                      <button
                        onClick={() => {
                          const newFiles = [...selectedFiles]
                          newFiles.splice(index, 1)
                          setSelectedFiles(newFiles)
                          const newContents = [...fileContents]
                          newContents.splice(index, 1)
                          setFileContents(newContents)
                          if (importMode === 'two-file') {
                            if (nodesFileIndex === index) setNodesFileIndex(null)
                            if (edgesFileIndex === index) setEdgesFileIndex(null)
                            if (nodesFileIndex && nodesFileIndex > index) setNodesFileIndex(nodesFileIndex - 1)
                            if (edgesFileIndex && edgesFileIndex > index) setEdgesFileIndex(edgesFileIndex - 1)
                          }
                        }}
                        className="text-red-600 text-sm hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      // Create a new input to allow adding more files
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = '.csv,.gexf'
                      input.multiple = true
                      input.onchange = async (e) => {
                        const target = e.target as HTMLInputElement
                        const newFiles = Array.from(target.files || [])
                        if (newFiles.length > 0) {
                          const newContents = await Promise.all(newFiles.map(f => f.text()))
                          setSelectedFiles([...selectedFiles, ...newFiles])
                          setFileContents([...fileContents, ...newContents])
                          
                          // Re-evaluate file type and mode
                          const allFiles = [...selectedFiles, ...newFiles]
                          if (allFiles.length === 2 && allFiles.every(f => f.name.toLowerCase().endsWith('.csv'))) {
                            setImportMode('two-file')
                            setFileType('csv')
                          }
                        }
                      }
                      input.click()
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add More Files
                  </button>
                </div>
              </div>
            )}

            {/* Two-File CSV Configuration */}
            {importMode === 'two-file' && selectedFiles.length > 0 && (
              <div className="border-t pt-4 space-y-4" data-file-select>
                <h3 className="font-semibold">Map Files and Fields</h3>
                
                {/* Nodes File Selection */}
                <div data-field-select>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nodes File (Locations) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={nodesFileIndex ?? ''}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value)
                      setNodesFileIndex(idx)
                      const headers = parseCSVHeaders(fileContents[idx])
                      setNodesHeaders(headers)
                      const idField = headers.find(h => h.toLowerCase() === 'id')
                      if (idField) setNodeIdField(idField)
                      // Clear error
                      if (validationErrors.nodesFile) {
                        const newErrors = { ...validationErrors }
                        delete newErrors.nodesFile
                        setValidationErrors(newErrors)
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md ${
                      validationErrors.nodesFile ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select file...</option>
                    {selectedFiles.map((file, index) => (
                      <option key={index} value={index}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.nodesFile && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.nodesFile}</p>
                  )}
                  
                  {nodesFileIndex !== null && nodesHeaders.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">ID Field *</label>
                        <select
                          value={nodeIdField}
                          onChange={(e) => {
                            setNodeIdField(e.target.value)
                            if (validationErrors.nodeIdField) {
                              const newErrors = { ...validationErrors }
                              delete newErrors.nodeIdField
                              setValidationErrors(newErrors)
                            }
                          }}
                          className={`w-full px-2 py-1 border rounded text-sm ${
                            validationErrors.nodeIdField ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select field...</option>
                          {nodesHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        {validationErrors.nodeIdField && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.nodeIdField}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Label Field (optional)</label>
                        <select
                          value={nodeLabelField}
                          onChange={(e) => setNodeLabelField(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Use ID field</option>
                          {nodesHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edges File Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edges File (Flows) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={edgesFileIndex ?? ''}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value)
                      setEdgesFileIndex(idx)
                      const headers = parseCSVHeaders(fileContents[idx])
                      setEdgesHeaders(headers)
                      const sourceField = headers.find(h => h.toLowerCase() === 'source' || h.toLowerCase() === 'origin' || h.toLowerCase() === 'from')
                      const targetField = headers.find(h => h.toLowerCase() === 'target' || h.toLowerCase() === 'dest' || h.toLowerCase() === 'to')
                      const valueField = headers.find(h => h.toLowerCase() === 'value' || h.toLowerCase() === 'count' || h.toLowerCase() === 'weight')
                      if (sourceField) setEdgeSourceField(sourceField)
                      if (targetField) setEdgeTargetField(targetField)
                      if (valueField) setEdgeValueField(valueField)
                      // Clear error
                      if (validationErrors.edgesFile) {
                        const newErrors = { ...validationErrors }
                        delete newErrors.edgesFile
                        setValidationErrors(newErrors)
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md ${
                      validationErrors.edgesFile ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select file...</option>
                    {selectedFiles.map((file, index) => (
                      <option key={index} value={index}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.edgesFile && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.edgesFile}</p>
                  )}
                  
                  {edgesFileIndex !== null && edgesHeaders.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Source Field *</label>
                        <select
                          value={edgeSourceField}
                          onChange={(e) => {
                            setEdgeSourceField(e.target.value)
                            if (validationErrors.edgeSourceField) {
                              const newErrors = { ...validationErrors }
                              delete newErrors.edgeSourceField
                              setValidationErrors(newErrors)
                            }
                          }}
                          className={`w-full px-2 py-1 border rounded text-sm ${
                            validationErrors.edgeSourceField ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select field...</option>
                          {edgesHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        {validationErrors.edgeSourceField && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.edgeSourceField}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Target Field *</label>
                        <select
                          value={edgeTargetField}
                          onChange={(e) => {
                            setEdgeTargetField(e.target.value)
                            if (validationErrors.edgeTargetField) {
                              const newErrors = { ...validationErrors }
                              delete newErrors.edgeTargetField
                              setValidationErrors(newErrors)
                            }
                          }}
                          className={`w-full px-2 py-1 border rounded text-sm ${
                            validationErrors.edgeTargetField ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select field...</option>
                          {edgesHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        {validationErrors.edgeTargetField && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.edgeTargetField}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Value Field *</label>
                        <select
                          value={edgeValueField}
                          onChange={(e) => {
                            setEdgeValueField(e.target.value)
                            if (validationErrors.edgeValueField) {
                              const newErrors = { ...validationErrors }
                              delete newErrors.edgeValueField
                              setValidationErrors(newErrors)
                            }
                          }}
                          className={`w-full px-2 py-1 border rounded text-sm ${
                            validationErrors.edgeValueField ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select field...</option>
                          {edgesHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        {validationErrors.edgeValueField && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.edgeValueField}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dataset Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dataset Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={datasetName}
                onChange={(e) => {
                  setDatasetName(e.target.value)
                  // Clear error when user starts typing
                  if (validationErrors.name) {
                    const newErrors = { ...validationErrors }
                    delete newErrors.name
                    setValidationErrors(newErrors)
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Enter a name for this dataset"
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
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

            {/* General Errors */}
            {validationErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="font-semibold text-red-800 mb-2">Error:</h4>
                <p className="text-sm text-red-700">{validationErrors.general}</p>
              </div>
            )}

            {/* Data Summary (with warnings if any) */}
            {parsedData && (
              <div ref={errorsSummaryRef} className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="font-semibold text-blue-800 mb-2">Data Summary</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>
                    <span className="font-medium">Nodes:</span> {parsedData.nodes.length}
                  </div>
                  <div>
                    <span className="font-medium">Edges:</span> {parsedData.edges.length}
                  </div>
                  {parsedData.timeRange && (
                    <div>
                      <span className="font-medium">Time Range:</span>{' '}
                      {parsedData.timeRange.start}
                      {parsedData.timeRange.end !== parsedData.timeRange.start
                        ? ` – ${parsedData.timeRange.end}`
                        : ''}
                    </div>
                  )}
                  {parsedData.nodes.length > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="font-medium">Sample node properties:</span>{' '}
                      {Object.keys(parsedData.nodes[0]).slice(0, 5).join(', ')}
                      {Object.keys(parsedData.nodes[0]).length > 5 && '...'}
                    </div>
                  )}
                  {validationErrors.summary && (
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <span className="font-medium text-orange-700">Warnings:</span>{' '}
                      <span className="text-orange-600">{validationErrors.summary}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            disabled={isImporting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            type="button"
            disabled={isImporting || (() => {
              // Button is disabled if there are blocking errors (not just summary warnings)
              const blockingErrors = Object.keys(validationErrors).filter(k => k !== 'summary')
              return blockingErrors.length > 0 || !parsedData
            })()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {isImporting ? 'Importing...' : 'Import Dataset'}
          </button>
        </div>
      </div>
    </div>
  )
}
