import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSXNamespace from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XLSX = XLSXNamespace.readFile ? XLSXNamespace : XLSXNamespace.default;

if (!XLSX?.readFile || !XLSX?.utils) {
  throw new Error(
    'Unable to load XLSX helpers. Ensure the "xlsx" package is installed correctly.',
  );
}

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.resolve(
  projectRoot,
  'src/data/StateToStateMigrationUSXLS',
);
const outputDir = path.resolve(
  projectRoot,
  'src/data/StateToStateMigrationUSCSV',
);
const defaultDatasetPath = path.resolve(
  projectRoot,
  'src/data/State_to_State_Migrations_Table_2021.csv',
);

const ALLOWED_EXTENSIONS = new Set(['.xls', '.xlsx']);
const OUTPUT_HEADERS = [
  'period',
  'source_id',
  'source_label',
  'destination_id',
  'destination_label',
  'estimate',
  'moe',
];

const SHEET_PRIORITY = [
  /table/i,
  /state/i,
];

const CLEANUP_PATTERNS = [/^footnotes?/i, /^source:/i];
const EXCLUDED_LABELS = new Set([
  'TOTAL',
  'UNITED STATES',
  'UNITED STATES2',
  'US ISLAND AREA',
  'U.S. ISLAND AREA',
]);

function normalizeLabel(label) {
  return label.trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeStateName(name) {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();
}

function parseNumber(value) {
  if (typeof value !== 'string') return Number.isFinite(value) ? Number(value) : NaN;
  const cleaned = value
    .replace(/["]/g, '')
    .replace(/\u2212/g, '-') // minus sign
    .replace(/[+/]/g, '')
    .replace(/±/g, '')
    .replace(/[\s]/g, '')
    .replace(/,/g, '');
  if (!cleaned || cleaned.toUpperCase() === 'N/A') return NaN;
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? NaN : Math.abs(num);
}

function derivePeriodFromFilename(filename) {
  // Capture year-like tokens
  const yearMatches = filename.match(/(19|20)\d{2}(?:[_-](19|20)\d{2})?/gi);
  if (yearMatches && yearMatches.length > 0) {
    const cleaned = yearMatches[0].replace(/_/g, '-');
    return cleaned;
  }
  // Fallback to everything between first and last digit sequence
  const sequence = filename.match(/\d+/g);
  if (sequence && sequence.length > 0) {
    return sequence.join('-');
  }
  return 'unknown';
}

function sanitizeFileStem(stem) {
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

function findHeaderRowIndex(rows) {
  return rows.findIndex((row) => {
    if (!row) return false;
    const labels = row
      .map((cell) => (typeof cell === 'string' ? cell.trim() : ''))
      .filter(Boolean);
    if (labels.length < 10) return false;
    return labels.some((label) =>
      /^(total|alabama|arizona|new york|california)$/i.test(label),
    );
  });
}

function extractDestEntries(rows, headerRowIndex) {
  if (headerRowIndex === -1) {
    throw new Error('Unable to locate destination header row');
  }

  const headerRow = rows[headerRowIndex];
  const entries = [];

  for (let index = 0; index < headerRow.length; index++) {
    const rawLabel = headerRow[index];
    const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
    if (!label) continue;
    entries.push({ label, index });
  }

  return entries;
}

function isDataRowCandidate(row) {
  if (!row || !row[0]) return false;
  const firstCell = typeof row[0] === 'string' ? row[0].trim() : '';
  if (!firstCell) return false;
  if (CLEANUP_PATTERNS.some((pattern) => pattern.test(firstCell))) {
    return false;
  }
  return true;
}

function selectSheet(workbook) {
  if (!workbook.SheetNames?.length) return null;
  for (const pattern of SHEET_PRIORITY) {
    const sheetName = workbook.SheetNames.find((name) => pattern.test(name));
    if (sheetName) return sheetName;
  }
  return workbook.SheetNames[0];
}

async function ensureCleanOutputDir() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
}

async function iterateSourceFiles() {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      name: entry.name,
      absolutePath: path.join(sourceDir, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function extractRowsFromSheet(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });
}

function isExcludedLabel(label) {
  if (!label) return false;
  const normalized = normalizeLabel(label);
  if (!normalized) return true; // treat as blank
  if (EXCLUDED_LABELS.has(normalized)) return true;
  if (normalized.includes('TOTAL')) return true;
  return false;
}

function shouldSkipDestination(label) {
  if (!label) return true;
  if (/year ago/i.test(label)) return true;
  if (isExcludedLabel(label)) return true;
  return false;
}

function buildOutputRecords({ rows, destEntries, period }) {
  const records = [];
  const headerRowIndex = findHeaderRowIndex(rows);
  const startRowIndex = headerRowIndex + 2; // skip Estimate/MOE row

  for (let rowIndex = startRowIndex; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!isDataRowCandidate(row)) {
      continue;
    }

    const sourceLabel = String(row[0]).trim();
    if (!sourceLabel) continue;
    if (isExcludedLabel(sourceLabel)) continue;
    const sourceId = normalizeStateName(sourceLabel);

    for (const entry of destEntries) {
      const { label: destinationLabel, index } = entry;

      if (shouldSkipDestination(destinationLabel)) {
        continue;
      }

      const estimateValue = parseNumber(row[index]);
      const moeValue = parseNumber(row[index + 1]);

      if (!Number.isFinite(estimateValue) || estimateValue <= 0) {
        continue;
      }

      const destinationId = normalizeStateName(destinationLabel);

      records.push({
        period,
        source_id: sourceId,
        source_label: sourceLabel,
        destination_id: destinationId,
        destination_label: destinationLabel.trim(),
        estimate: estimateValue,
        moe: Number.isFinite(moeValue) ? moeValue : '',
      });
    }
  }

  return records;
}

function serializeRecords(records) {
  const lines = [OUTPUT_HEADERS.join(',')];
  for (const record of records) {
    lines.push(
      [
        record.period,
        record.source_id,
        `"${record.source_label.replace(/"/g, '""')}"`,
        record.destination_id,
        `"${record.destination_label.replace(/"/g, '""')}"`,
        record.estimate,
        record.moe,
      ].join(','),
    );
  }
  return lines.join('\n');
}

async function convertWorkbook({ name, absolutePath }) {
  const workbook = XLSX.readFile(absolutePath, {
    raw: false,
    cellDates: false,
    dateNF: 'yyyy-mm-dd',
  });

  const selectedSheetName = selectSheet(workbook);
  if (!selectedSheetName) {
    console.warn(`⚠️  Skipping "${name}" – no usable sheets found.`);
    return null;
  }

  const sheet = workbook.Sheets[selectedSheetName];
  if (!sheet) {
    console.warn(`⚠️  Skipping "${name}" – sheet "${selectedSheetName}" missing.`);
    return null;
  }

  const rows = extractRowsFromSheet(sheet);
  if (!rows.length) {
    console.warn(`⚠️  Skipping "${name}" – sheet "${selectedSheetName}" empty.`);
    return null;
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    console.warn(`⚠️  Unable to locate header row for "${name}".`);
    return null;
  }

  const destEntries = extractDestEntries(rows, headerRowIndex);
  if (!destEntries.length) {
    console.warn(`⚠️  No destination columns found for "${name}".`);
    return null;
  }

  const period = derivePeriodFromFilename(name);
  const records = buildOutputRecords({ rows, destEntries, period });

  if (!records.length) {
    console.warn(`⚠️  Generated 0 records for "${name}".`);
    return null;
  }

  const fileStem = sanitizeFileStem(path.parse(name).name);
  const outputName = `${fileStem || 'state_migration'}_${period}.csv`;
  const outputPath = path.join(outputDir, outputName);

  await fs.writeFile(outputPath, serializeRecords(records), 'utf8');

  return {
    outputPath,
    recordCount: records.length,
    period,
    sheetName: selectedSheetName,
  };
}

async function copyIfDefaultDataset(result, sourceName) {
  if (!result) return;
  if (!/2021/i.test(sourceName)) return;

  await fs.writeFile(defaultDatasetPath, await fs.readFile(result.outputPath, 'utf8'), 'utf8');
}

async function main() {
  console.info('📂 Source directory:', sourceDir);
  console.info('📁 Output directory:', outputDir);
  await ensureCleanOutputDir();

  const files = await iterateSourceFiles();
  if (files.length === 0) {
    console.warn('⚠️  No XLS/XLSX files found to convert.');
    return;
  }

  let processedFiles = 0;
  for (const file of files) {
    processedFiles += 1;
    console.info(`\n📄 Converting "${file.name}"...`);
    try {
      const result = await convertWorkbook(file);
      if (result) {
        console.info(
          `✅  Wrote ${path.basename(result.outputPath)} (${result.recordCount} records, sheet "${result.sheetName}")`,
        );
        await copyIfDefaultDataset(result, file.name);
      }
    } catch (error) {
      console.error(`❌ Failed to convert "${file.name}":`, error);
    }
  }

  console.info(`\n✨ Completed processing ${processedFiles} file(s).`);
}

main().catch((error) => {
  console.error('❌ Conversion failed:', error);
  process.exitCode = 1;
});

