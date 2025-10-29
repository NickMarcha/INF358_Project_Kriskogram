/**
 * Parser for two-file CSV format (separate nodes and edges files)
 * 
 * Example: Swiss Relocations dataset
 * - locations.csv: id, name, lat, lon
 * - flows.csv: origin, dest, count
 */

export interface TwoFileCSVConfig {
  nodesFile: {
    content: string
    idField: string
    labelField?: string  // Optional, defaults to idField
  }
  edgesFile: {
    content: string
    sourceField: string
    targetField: string
    valueField: string
  }
}

export interface ParsedTwoFileCSV {
  nodes: any[]
  edges: any[]
}

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

function parseCSV(content: string): { headers: string[], rows: string[][] } {
  const lines = content.trim().split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }
  
  // Trim headers to remove any whitespace issues
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const rows = lines.slice(1).map(parseCSVLine)
  
  return { headers, rows }
}

function parseNumber(value: string): number | string {
  const cleaned = value.replace(/[",]/g, '').trim()
  const num = Number.parseFloat(cleaned)
  return Number.isNaN(num) ? cleaned : num
}

export function parseTwoFileCSV(config: TwoFileCSVConfig): ParsedTwoFileCSV {
  // Parse nodes file
  const { headers: nodeHeaders, rows: nodeRows } = parseCSV(config.nodesFile.content)
  
  // Normalize field names for comparison (trim and case-insensitive)
  const normalizedNodeHeaders = nodeHeaders.map(h => h.toLowerCase().trim())
  const idFieldNormalized = config.nodesFile.idField.toLowerCase().trim()
  const labelFieldNormalized = config.nodesFile.labelField?.toLowerCase().trim() || idFieldNormalized
  
  const idFieldIndex = normalizedNodeHeaders.indexOf(idFieldNormalized)
  const labelFieldIndex = config.nodesFile.labelField
    ? normalizedNodeHeaders.indexOf(labelFieldNormalized)
    : idFieldIndex

  if (idFieldIndex === -1) {
    throw new Error(`ID field "${config.nodesFile.idField}" not found in nodes file. Available fields: ${nodeHeaders.join(', ')}`)
  }

  const nodes = nodeRows.map(row => {
    const node: any = {
      id: String(row[idFieldIndex] || '').trim(),
      label: labelFieldIndex >= 0 ? String(row[labelFieldIndex] || '').trim() : String(row[idFieldIndex] || '').trim(),
    }
    
    // Add all other fields as properties
    // Compare against normalized versions for field exclusion
    const idFieldActual = nodeHeaders[idFieldIndex]
    const labelFieldActual = config.nodesFile.labelField ? nodeHeaders[labelFieldIndex] : idFieldActual
    nodeHeaders.forEach((header, index) => {
      if (header !== idFieldActual && header !== labelFieldActual) {
        const value = row[index]?.trim() || ''
        node[header] = parseNumber(value)
      }
    })
    
    return node
  }).filter(node => node.id) // Filter out rows with no ID

  // Create node ID map for validation
  const nodeIdMap = new Map(nodes.map(n => [n.id, n]))

  // Parse edges file
  const { headers: edgeHeaders, rows: edgeRows } = parseCSV(config.edgesFile.content)
  
  // Normalize field names for comparison (trim and case-insensitive)
  const normalizedEdgeHeaders = edgeHeaders.map(h => h.toLowerCase().trim())
  const sourceFieldNormalized = config.edgesFile.sourceField.toLowerCase().trim()
  const targetFieldNormalized = config.edgesFile.targetField.toLowerCase().trim()
  const valueFieldNormalized = config.edgesFile.valueField.toLowerCase().trim()
  
  const sourceFieldIndex = normalizedEdgeHeaders.indexOf(sourceFieldNormalized)
  const targetFieldIndex = normalizedEdgeHeaders.indexOf(targetFieldNormalized)
  const valueFieldIndex = normalizedEdgeHeaders.indexOf(valueFieldNormalized)

  if (sourceFieldIndex === -1) {
    throw new Error(`Source field "${config.edgesFile.sourceField}" not found in edges file. Available fields: ${edgeHeaders.join(', ')}`)
  }
  if (targetFieldIndex === -1) {
    throw new Error(`Target field "${config.edgesFile.targetField}" not found in edges file. Available fields: ${edgeHeaders.join(', ')}`)
  }
  if (valueFieldIndex === -1) {
    throw new Error(`Value field "${config.edgesFile.valueField}" not found in edges file. Available fields: ${edgeHeaders.join(', ')}`)
  }

  // Use original field names when accessing data (but matching was case-insensitive)
  const edges = edgeRows
    .map(row => {
      const source = String(row[sourceFieldIndex] || '').trim()
      const target = String(row[targetFieldIndex] || '').trim()
      const valueStr = String(row[valueFieldIndex] || '').trim()
      const value = parseNumber(valueStr)

      if (!source || !target || typeof value !== 'number' || value <= 0) {
        return null
      }

      // Validate that source and target exist in nodes
      if (!nodeIdMap.has(source) || !nodeIdMap.has(target)) {
        // Still create edge but mark missing nodes
        console.warn(`Edge references missing node: ${source} -> ${target}`)
      }

      const edge: any = {
        source,
        target,
        value: value as number,
      }

      // Add all other fields as properties
      // Use actual header names from the file
      const sourceFieldActual = edgeHeaders[sourceFieldIndex]
      const targetFieldActual = edgeHeaders[targetFieldIndex]
      const valueFieldActual = edgeHeaders[valueFieldIndex]
      edgeHeaders.forEach((header, index) => {
        if (header !== sourceFieldActual && 
            header !== targetFieldActual && 
            header !== valueFieldActual) {
          const value = row[index]?.trim() || ''
          edge[header] = parseNumber(value)
        }
      })

      return edge
    })
    .filter((edge): edge is any => edge !== null && nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target))

  // Add any missing nodes that are referenced in edges but not in nodes file
  const referencedNodeIds = new Set<string>()
  edges.forEach(e => {
    referencedNodeIds.add(e.source)
    referencedNodeIds.add(e.target)
  })

  referencedNodeIds.forEach(nodeId => {
    if (!nodeIdMap.has(nodeId)) {
      nodes.push({
        id: nodeId,
        label: nodeId,
      })
    }
  })

  return { nodes, edges }
}

