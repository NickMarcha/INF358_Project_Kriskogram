import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseStateMigrationCSV } from '../src/lib/csv-parser';
import { STATE_MIGRATION_CSV_FILES } from '../src/data/stateMigrationFiles';
import { STATE_LABELS, STATE_LABEL_SET } from '../src/data/stateLabels';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(PROJECT_ROOT, 'src', 'data');
const CSV_DIR = path.resolve(DATA_DIR, 'StateToStateMigrationUSCSV');

interface CsvUnderTest {
  label: string;
  filePath: string;
}

const tidyCsvFiles: CsvUnderTest[] = STATE_MIGRATION_CSV_FILES.map((entry) => ({
  label: `${entry.title} (${entry.filename})`,
  filePath: path.resolve(CSV_DIR, entry.filename),
}));

const legacySingleYear: CsvUnderTest = {
  label: 'State-to-State Migrations Table 2021 (root CSV)',
  filePath: path.resolve(DATA_DIR, 'State_to_State_Migrations_Table_2021.csv'),
};

describe('State migration CSV completeness', () => {
  for (const csv of [...tidyCsvFiles, legacySingleYear]) {
    it(`includes exactly the 50 states + District of Columbia: ${csv.label}`, async () => {
      const raw = await readFile(csv.filePath, 'utf8');
      const parsed = parseStateMigrationCSV(raw);

      const labels = new Set(parsed.nodes.map((node) => node.label));

      const missing = STATE_LABELS.filter((state) => !labels.has(state));
      const extras = Array.from(labels).filter((label) => !STATE_LABEL_SET.has(label));

      expect(missing, `Missing states in ${csv.label}: ${missing.join(', ')}`).toStrictEqual([]);
      expect(extras, `Unexpected labels in ${csv.label}: ${extras.join(', ')}`).toStrictEqual([]);
    });
  }
});

