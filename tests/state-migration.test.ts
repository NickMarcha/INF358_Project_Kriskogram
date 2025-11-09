import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseStateMigrationCSV } from '../src/lib/csv-parser'
import { STATE_LABELS, STATE_LABEL_SET, EXPECTED_STATE_COUNT } from '../src/data/stateLabels'
import { STATE_MIGRATION_CSV_FILES } from '../src/data/stateMigrationFiles'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dataDir = resolve(__dirname, '../src/data/StateToStateMigrationUSCSV')

describe('State-to-State migration CSV parser', () => {
  const pre2020Files = STATE_MIGRATION_CSV_FILES.filter((entry) => entry.year >= 2005 && entry.year <= 2019)

  it.each(pre2020Files.map((entry) => [entry.year, entry.filename]))(
    'includes all expected states for %d',
    (_year, filename) => {
      const csvPath = resolve(dataDir, filename)
      const csvContent = readFileSync(csvPath, 'utf8')
      const parsed = parseStateMigrationCSV(csvContent)

      const labels = new Set(parsed.nodes.map((node) => node.label))

      expect(parsed.nodes.length).toBe(EXPECTED_STATE_COUNT)
      expect(labels.size).toBe(EXPECTED_STATE_COUNT)

      const missing = STATE_LABELS.filter((state) => !labels.has(state))
      expect(missing).toEqual([])

      expect(labels.has('Vermont')).toBe(true)
      expect(parsed.edges.length).toBeGreaterThan(0)
    },
  )

  it('uses consistent state identifiers for Vermont in 2015 snapshot', () => {
    const csvPath = resolve(dataDir, 'state_to_state_migrations_table_2015_2015.csv')
    const csvContent = readFileSync(csvPath, 'utf8')
    const parsed = parseStateMigrationCSV(csvContent)

    const vermontNode = parsed.nodes.find((node) => node.label === 'Vermont')
    expect(vermontNode).toBeDefined()
    expect(vermontNode?.id).toBe('VERMONT')

    const connectedEdges = parsed.edges.filter(
      (edge) => edge.source === 'VERMONT' || edge.target === 'VERMONT',
    )
    expect(connectedEdges.length).toBeGreaterThan(0)

    const labels = new Set(parsed.nodes.map((node) => node.label))
    expect(STATE_LABEL_SET.size).toBe(EXPECTED_STATE_COUNT)
    STATE_LABEL_SET.forEach((state) => {
      expect(labels.has(state)).toBe(true)
    })
  })
})

