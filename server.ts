import express, { Request, Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import * as XLSX from 'xlsx';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MAX_UPLOAD_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10);
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const UPLOAD_DIR = path.resolve(__dirname, 'data', 'uploads');

// Ensure private uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getPythonExecutable(): string {
  const venvWin = path.resolve(__dirname, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) return venvWin;
  const venvUnix = path.resolve(__dirname, '.venv', 'bin', 'python');
  if (fs.existsSync(venvUnix)) return venvUnix;
  return process.env.PYTHON_PATH || 'python';
}

function runQsarPredictionScript(csvFilePath: string, outputCsvPath: string, smilesCol?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonExe = getPythonExecutable();
    const scriptPath = path.resolve(__dirname, 'predict_idh1.py');
    const artifactsDir = path.resolve(__dirname, 'idh1_qsar_artifacts');

    const args = [
      scriptPath,
      csvFilePath,
      '--output_csv',
      outputCsvPath,
      '--artifacts_dir',
      artifactsDir,
    ];

    if (smilesCol) {
      args.push('--smiles_col', smilesCol);
    }

    const proc = spawn(pythonExe, args);
    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('[QSAR Prediction Script Error]:', stderrData);
        return reject(new Error(stderrData || `Prediction process exited with code ${code}`));
      }
      try {
        const jsonStartIndex = stdoutData.indexOf('{');
        if (jsonStartIndex === -1) {
          return reject(new Error('No valid JSON output from prediction script'));
        }
        const jsonStr = stdoutData.slice(jsonStartIndex);
        const parsed = JSON.parse(jsonStr);
        resolve(parsed);
      } catch (err: any) {
        console.error('Failed to parse prediction output:', stdoutData);
        reject(new Error(`Failed to parse prediction JSON: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// In-memory dataset metadata store (in addition to disk storage of the raw CSV)
export interface ProblematicRowIssue {
  type: 'duplicate' | 'missing_value' | 'invalid_smiles' | 'inconsistent_columns';
  column?: string;
  message: string;
  duplicate_of_row?: number;
  suggested_action: string;
}

export interface ProblematicRowItem {
  row_number: number; // 1-based row number in Excel/CSV (row 1 is header, dataRow 0 is row 2)
  data_row_index: number; // 1-based data index (1 is first data row)
  issues: ProblematicRowIssue[];
  row_data: Record<string, any>;
}

interface StoredDataset {
  dataset_id: string;
  original_filename: string;
  stored_filename: string;
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  columns: string[];
  column_details: {
    name: string;
    index: number;
    inferredType: 'number' | 'string' | 'boolean' | 'empty';
    missingCount: number;
    missingPercentage: number;
    uniqueCount: number;
    sampleValues: (string | number | boolean | null)[];
  }[];
  missing_values_total: number;
  missing_values_by_column: Record<string, number>;
  duplicate_rows: number;
  problematic_rows?: ProblematicRowItem[];
  problematic_rows_count?: number;
  validation_status: 'valid' | 'valid_with_warnings' | 'rejected';
  warnings: string[];
  preview: Record<string, any>[];
  uploaded_at: string;
  smiles_column_detected?: boolean;
  smiles_column_name?: string | null;
  qsar_predictions?: any;
}

const datasetStore = new Map<string, StoredDataset>();

// Auto-cleanup datasets older than 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, ds] of datasetStore.entries()) {
    const uploadedTime = new Date(ds.uploaded_at).getTime();
    if (now - uploadedTime > 24 * 60 * 60 * 1000) {
      try {
        const filePath = path.join(UPLOAD_DIR, ds.stored_filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Failed to cleanup file:', err);
      }
      datasetStore.delete(id);
    }
  }
}, 60 * 60 * 1000);

// Multer memory storage with file size filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    // Check filename extension for CSV or Excel
    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      return cb(new Error('INVALID_EXTENSION'));
    }
    cb(null, true);
  },
});

app.use(express.json());

// CORS headers for API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 12.1 Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Sample datasets definition for testing/demo
const SAMPLE_METADATA = [
  {
    id: 'kinase_inhibitors',
    name: 'Kinase Inhibitors Dataset (Valid)',
    description: 'Dataset molekuler valid dengan 15 senyawa inhibitor kinase, deskriptor fisikokimia (MW, LogP, HBD, HBA), dan pIC50.',
    category: 'valid',
    filename: 'kinase_inhibitors_sample.csv',
    content: `compound_id,smiles,molecular_weight,log_p,hbd,hba,activity_pIC50
CMP_001,CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5,539.67,3.92,2,7,8.45
CMP_002,CS(=O)(=O)CC1=CC=C(O1)C2=CC3=C(C=C2)N=CN=C3NC4=CC(=C(C=C4)OCC5=CC(=CC=C5)F)Cl,581.06,4.71,1,6,7.82
CMP_003,CCOC(=O)C1=C(NC(=C(C1C2=CC=C(C=C2)Cl)C(=O)OC)C)C,347.80,3.15,1,4,6.20
CMP_004,CN1CCN(CC1)CC2=CC=C(C=C2)C(=O)NC3=CC(=C(C=C3)C)C4=NC5=C(N4)C=C(C=C5)OC,470.57,3.34,2,6,8.10
CMP_005,C1CC1C(=O)NC2=CC=C(C=C2)C3=C4C(=NC=N3)N(C=C4)C5CCCC5,348.40,2.89,1,4,6.95
CMP_006,CC(C)(C)C1=CC(=NO1)NC(=O)NC2=CC=C(C=C2)C3=CC4=C(C=C3)C(=NN4)C5=CC=NC=C5,466.54,4.21,2,5,7.60
CMP_007,CNC(=O)C1=CC=CC=C1SC2=CC3=C(C=C2)C(=NN3)C4=CC=C(C=C4)N,374.46,2.65,2,4,7.15
CMP_008,CC1=C(C(=NO1)C)C2=CC=C(C=C2)S(=O)(=O)NC3=NC=C(C=C3)Cl,363.82,2.44,1,5,5.90
CMP_009,C1CNCCC1NC(=O)C2=CC=C(C=C2)C3=CC=CC=C3Cl,314.81,3.48,2,2,6.50
CMP_010,COC1=C(C=C2C(=C1)N=CN=C2NC3=CC(=C(C=C3)F)Cl)OCCCN4CCOCC4,446.90,3.22,1,6,8.30
CMP_011,CC1=CN=C(C(=N1)C2=CC=CC=C2)NC3=CC=C(C=C3)S(=O)(=O)N,326.37,1.80,2,4,6.10
CMP_012,C1=CC=C(C(=C1)C2=NC=C(N2)C3=CC=C(C=C3)NC(=O)C4CC4)F,321.35,3.05,2,3,7.40
CMP_013,CCN(CC)CCNC(=O)C1=C(NC(=C1C)C=C2C3=C(C=CC=C3)NC2=O)C,398.54,2.98,2,3,7.95
CMP_014,CC1=CC(=C(C(=C1)C)C2=NC(=NC(=C2)N)NC3=CC(=CC(=C3)Cl)Cl)C,347.24,3.85,3,3,6.75
CMP_015,CC1=CC=C(C=C1)C2=C(C(=O)N(C2=O)C3=CC=C(C=C3)S(=O)(=O)N)C4=CC=CC=C4,392.43,2.15,1,5,5.80`,
  },
  {
    id: 'bioactivity_descriptors',
    name: 'Molecular Descriptors (Dengan Missing & Duplicate)',
    description: 'Dataset dengan sel kosong (missing values) dan baris duplikat untuk menguji status valid_with_warnings.',
    category: 'warning',
    filename: 'molecular_descriptors_warnings.csv',
    content: `mol_id,smiles,logP,tpsa,num_rotatable_bonds,pic50_activity
MOL_101,CC(=O)Oc1ccccc1C(=O)O,1.19,63.60,3,4.2
MOL_102,CC(C)Cc1ccc(cc1)C(C)C(=O)O,3.50,37.30,4,5.1
MOL_103,CN1C=NC2=C1C(=O)N(C(=O)N2C)C,0.16,58.44,0,3.8
MOL_104,CC(=O)NC1=CC=C(C=C1)O,0.46,49.33,1,4.0
MOL_105,CCN(CC)C(=O)C1CN(C2CC3=CNC4=CC=CC(=C34)C2=C1)C,2.80,,5,6.3
MOL_106,CC(C)NCC(O)COC1=CC=C(C=C1)CC(=O)N,0.10,72.47,,5.9
MOL_107,CC(C)NCC(O)COC1=CC=C(C=C1)CC(=O)N,0.10,72.47,,5.9
MOL_108,C1=CC=C(C=C1)C(=O)NO,-0.12,49.33,1,
MOL_109,CN1C2CCC1C(C(C2)OC(=O)C3=CC=CC=C3)C(=O)OC,2.30,52.93,4,7.2
MOL_110,CN1C2CCC1C(C(C2)OC(=O)C3=CC=CC=C3)C(=O)OC,2.30,52.93,4,7.2
MOL_111,C1=CC(=C(C=C1Cl)Cl)C(C2=CC(=C(C=C2)Cl)Cl)C(Cl)(Cl)Cl,6.91,0.00,2,3.1
MOL_112,c1ccc2c(c1)ccc3c2ccc4c5ccccc5ccc43,5.68,0.00,0,4.7`,
  },
  {
    id: 'malformed_structure',
    name: 'Invalid Dataset (Struktur Rusak)',
    description: 'File CSV tidak terstruktur (header kosong, inkonsistensi jumlah kolom) untuk menguji penolakan error validasi.',
    category: 'error',
    filename: 'invalid_malformed_test.csv',
    content: `compound_id,,activity
C001,0.12,1.45,extra_col_99
C002
C003,"broken quote
C004,0.11`,
  },
];

// Helper to inspect and validate CSV content
function validateCsvContent(rawContent: string, originalFilename: string, fileSize: number) {
  // Check empty
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return {
      isValid: false,
      errors: ['File kosong atau tidak berisi teks yang dapat dibaca.'],
    };
  }

  // Strip BOM if present
  let cleanContent = rawContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  // Detect delimiter: check first non-empty line for semicolon vs comma vs tab
  const rawLines = cleanContent.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  const firstLine = rawLines[0] || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount >= 1) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount >= 1) {
    delimiter = '\t';
  }

  // Parse with PapaParse using detected delimiter
  const parsed = Papa.parse<string[]>(cleanContent, {
    header: false,
    skipEmptyLines: 'greedy',
    delimiter,
  });

  const errors: string[] = [];

  // Check parsing fatal errors
  if (parsed.errors && parsed.errors.length > 0) {
    for (const e of parsed.errors.slice(0, 3)) {
      errors.push(`Kesalahan sintaksis CSV pada baris ${e.row ?? 'tidak diketahui'}: ${e.message}`);
    }
  }

  const rows = parsed.data;
  if (!rows || rows.length === 0) {
    errors.push('File CSV tidak memiliki baris data.');
    return { isValid: false, errors };
  }

  if (rows.length === 1) {
    errors.push('File hanya berisi baris header tanpa baris data.');
    return { isValid: false, errors };
  }

  // Validate header (row 0)
  const headerRow = rows[0];
  if (!headerRow || headerRow.length === 0) {
    errors.push('Header kolom tidak ditemukan.');
    return { isValid: false, errors };
  }

  const columns: string[] = [];
  const seenColumns = new Set<string>();

  for (let i = 0; i < headerRow.length; i++) {
    const rawCol = headerRow[i];
    const colName = rawCol !== undefined && rawCol !== null ? String(rawCol).trim() : '';
    if (!colName) {
      errors.push(`Header kolom pada posisi indeks ke-${i + 1} kosong.`);
    } else if (seenColumns.has(colName.toLowerCase())) {
      errors.push(`Ditemukan nama kolom duplikat pada header: '${colName}'.`);
    } else {
      seenColumns.add(colName.toLowerCase());
    }
    columns.push(colName || `Kolom_${i + 1}`);
  }

  const expectedColumnCount = columns.length;
  const dataRows = rows.slice(1);

  // Check consistent field counts per row
  let inconsistentRowCount = 0;
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (row.length !== expectedColumnCount) {
      inconsistentRowCount++;
      if (inconsistentRowCount <= 3) {
        errors.push(
          `Baris data ke-${r + 1} memiliki ${row.length} kolom (diharapkan ${expectedColumnCount} kolom).`
        );
      }
    }
  }

  if (inconsistentRowCount > 3) {
    errors.push(
      `Terdapat total ${inconsistentRowCount} baris dengan jumlah kolom yang tidak konsisten.`
    );
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // If hard checks passed, calculate metrics and warnings
  const warnings: string[] = [];
  let totalMissing = 0;
  const missingByCol: Record<string, number> = {};
  for (const c of columns) {
    missingByCol[c] = 0;
  }

  const rowSignatures = new Map<string, number>(); // signature -> first seen excel row number (1-based)
  let duplicateRowCount = 0;
  const problematicRowsMap = new Map<number, ProblematicRowItem>();

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    const excelRowNumber = r + 2; // Row 1 is header row in Excel/CSV
    const dataRowIndex = r + 1;

    // Convert row into column:value map & normalized array for reliable duplicate detection
    const rowObj: Record<string, any> = {};
    const normalizedRowValues: string[] = [];
    for (let c = 0; c < expectedColumnCount; c++) {
      const val = row[c];
      const strVal = val !== undefined && val !== null ? String(val).trim() : '';
      rowObj[columns[c]] = strVal;
      normalizedRowValues.push(strVal);
    }

    // Duplicate check
    const sig = JSON.stringify(normalizedRowValues);
    if (rowSignatures.has(sig)) {
      duplicateRowCount++;
      const firstSeenRowNumber = rowSignatures.get(sig)!;

      let item = problematicRowsMap.get(excelRowNumber);
      if (!item) {
        item = {
          row_number: excelRowNumber,
          data_row_index: dataRowIndex,
          issues: [],
          row_data: rowObj,
        };
        problematicRowsMap.set(excelRowNumber, item);
      }
      item.issues.push({
        type: 'duplicate',
        message: `Duplikat persis dari baris ke-${firstSeenRowNumber}`,
        duplicate_of_row: firstSeenRowNumber,
        suggested_action: `Baris ini memiliki data yang sama persis dengan baris ke-${firstSeenRowNumber}. Buka berkas di Excel / CSV dan hapus baris ke-${excelRowNumber} jika duplikasi tidak diinginkan.`,
      });
    } else {
      rowSignatures.set(sig, excelRowNumber);
    }

    // Missing values check
    for (let c = 0; c < expectedColumnCount; c++) {
      const val = row[c];
      const isMissing =
        val === undefined ||
        val === null ||
        String(val).trim() === '' ||
        String(val).trim().toLowerCase() === 'na' ||
        String(val).trim().toLowerCase() === 'nan' ||
        String(val).trim().toLowerCase() === 'null';

      if (isMissing) {
        totalMissing++;
        const colName = columns[c];
        missingByCol[colName] = (missingByCol[colName] || 0) + 1;

        let item = problematicRowsMap.get(excelRowNumber);
        if (!item) {
          item = {
            row_number: excelRowNumber,
            data_row_index: dataRowIndex,
            issues: [],
            row_data: rowObj,
          };
          problematicRowsMap.set(excelRowNumber, item);
        }
        item.issues.push({
          type: 'missing_value',
          column: colName,
          message: `Nilai kosong (missing value) pada kolom '${colName}'`,
          suggested_action: `Kolom '${colName}' pada baris ke-${excelRowNumber} kosong. Isi nilainya atau hapus baris jika tidak lengkap.`,
        });
      }
    }
  }

  const problematicRows = Array.from(problematicRowsMap.values());

  if (totalMissing > 0) {
    warnings.push(`Ditemukan ${totalMissing} nilai kosong (missing values) pada dataset.`);
  }

  if (duplicateRowCount > 0) {
    warnings.push(`Ditemukan ${duplicateRowCount} baris duplikat pada dataset.`);
  }

  // Inferred column types and details
  const columnDetails = columns.map((colName, colIdx) => {
    let numericCount = 0;
    let nonMissingCount = 0;
    const uniqueVals = new Set<string>();
    const samples: (string | number | boolean | null)[] = [];

    for (let r = 0; r < Math.min(dataRows.length, 100); r++) {
      const val = dataRows[r][colIdx];
      const raw = val !== undefined && val !== null ? String(val).trim() : '';
      if (raw !== '' && raw.toLowerCase() !== 'na' && raw.toLowerCase() !== 'nan') {
        nonMissingCount++;
        uniqueVals.add(raw);
        if (!isNaN(Number(raw))) {
          numericCount++;
        }
      }
      if (samples.length < 5 && raw !== '') {
        samples.push(raw);
      }
    }

    const missingInCol = missingByCol[colName] || 0;
    const missingPercentage =
      dataRows.length > 0 ? Number(((missingInCol / dataRows.length) * 100).toFixed(1)) : 0;

    let inferredType: 'number' | 'string' | 'boolean' | 'empty' = 'string';
    if (nonMissingCount === 0) {
      inferredType = 'empty';
    } else if (numericCount === nonMissingCount) {
      inferredType = 'number';
    } else if (
      Array.from(uniqueVals).every((v) => ['true', 'false', '1', '0'].includes(v.toLowerCase()))
    ) {
      inferredType = 'boolean';
    }

    // Check single distinct value warning
    if (nonMissingCount > 5 && uniqueVals.size === 1) {
      warnings.push(`Kolom '${colName}' hanya memiliki 1 nilai unik konstan.`);
    }

    return {
      name: colName,
      index: colIdx,
      inferredType,
      missingCount: missingInCol,
      missingPercentage,
      uniqueCount: uniqueVals.size,
      sampleValues: samples,
    };
  });

  // Generate preview of first 10 rows
  const preview = dataRows.slice(0, 10).map((row, rowIdx) => {
    const rowObj: Record<string, any> = { _rowIndex: rowIdx + 1 };
    for (let c = 0; c < expectedColumnCount; c++) {
      const val = row[c];
      const trimmedVal = val !== undefined && val !== null ? String(val).trim() : '';
      if (trimmedVal === '' || trimmedVal.toLowerCase() === 'na' || trimmedVal.toLowerCase() === 'nan') {
        rowObj[columns[c]] = null;
      } else if (!isNaN(Number(trimmedVal))) {
        // preserve formatted float or int
        rowObj[columns[c]] = Number(trimmedVal);
      } else {
        rowObj[columns[c]] = trimmedVal;
      }
    }
    return rowObj;
  });

  // Detect SMILES column
  let smiles_column_name: string | null = null;
  const smilesCandidates = [
    'smiles', 'canonical_smiles', 'canonical smiles', 'structure',
    'compound_smiles', 'mol_smiles', 'input_smiles', 'smiles_string',
    'struktur', 'notasi_smiles'
  ];

  // 1. Exact match in candidates
  for (const c of columns) {
    if (smilesCandidates.includes(c.trim().toLowerCase())) {
      smiles_column_name = c;
      break;
    }
  }

  // 2. Substring match
  if (!smiles_column_name) {
    for (const c of columns) {
      const low = c.trim().toLowerCase();
      if (low.includes('smiles') || low.includes('structure') || low.includes('struktur')) {
        smiles_column_name = c;
        break;
      }
    }
  }

  // 3. Heuristic match on samples or single column
  if (!smiles_column_name) {
    if (columns.length === 1) {
      smiles_column_name = columns[0];
    } else {
      for (const col of columnDetails) {
        const samples = col.sampleValues.filter((v) => typeof v === 'string') as string[];
        const hasSmilesPattern = samples.some((s) => s.length > 3 && /[CNOSPFclbr1-9=()#\\]/.test(s));
        if (hasSmilesPattern) {
          smiles_column_name = col.name;
          break;
        }
      }
    }
  }

  const validation_status = warnings.length > 0 ? 'valid_with_warnings' : 'valid';

  return {
    isValid: true,
    data: {
      total_rows: dataRows.length,
      total_columns: expectedColumnCount,
      columns,
      column_details: columnDetails,
      missing_values_total: totalMissing,
      missing_values_by_column: missingByCol,
      duplicate_rows: duplicateRowCount,
      problematic_rows: problematicRows,
      problematic_rows_count: problematicRows.length,
      validation_status,
      warnings,
      preview,
      smiles_column_detected: !!smiles_column_name,
      smiles_column_name,
    },
  };
}

// 12.2 POST /api/v1/datasets endpoint
app.post('/api/v1/datasets', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_EXTENSION') {
        return res.status(400).json({
          success: false,
          message: 'Ekstensi file tidak valid.',
          errors: ['Hanya file dengan ekstensi .csv, .xlsx, atau .xls yang diizinkan untuk diunggah.'],
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'Ukuran file melebihi batas maksimum.',
          errors: [`File melebihi batas ukuran maksimum yang diizinkan (${MAX_UPLOAD_SIZE_MB} MB).`],
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Gagal memproses unggahan file.',
        errors: [err.message || 'Terjadi kesalahan saat mengunggah file.'],
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File dataset tidak ditemukan.',
        errors: ['Silakan pilih file CSV (.csv) atau Excel (.xlsx, .xls) untuk diunggah.'],
      });
    }

    const originalFilename = file.originalname;
    const fileSize = file.size;

    // Check extension again defensively
    const lowerFilename = originalFilename.toLowerCase();
    const isCsv = lowerFilename.endsWith('.csv');
    const isExcel = lowerFilename.endsWith('.xlsx') || lowerFilename.endsWith('.xls');

    if (!isCsv && !isExcel) {
      return res.status(400).json({
        success: false,
        message: 'Ekstensi file tidak valid.',
        errors: ['Hanya file berekstensi .csv, .xlsx, atau .xls yang diterima.'],
      });
    }

    let rawContent: string;
    if (isExcel) {
      try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          return res.status(422).json({
            success: false,
            message: 'File Excel tidak memiliki lembar kerja (worksheet).',
            errors: ['Workbook Excel kosong atau tidak memiliki sheet.'],
          });
        }
        const worksheet = workbook.Sheets[sheetName];
        rawContent = XLSX.utils.sheet_to_csv(worksheet);
      } catch (excelErr: any) {
        return res.status(422).json({
          success: false,
          message: 'Gagal memproses file Excel.',
          errors: [excelErr.message || 'Format berkas Excel rusak atau tidak dapat dibaca.'],
        });
      }
    } else {
      rawContent = file.buffer.toString('utf-8');
      if (rawContent.includes('\ufffd')) {
        const latin1Content = file.buffer.toString('latin1');
        if (!latin1Content.includes('\ufffd')) {
          rawContent = latin1Content;
        }
      }
    }

    const validation = validateCsvContent(rawContent, originalFilename, fileSize);

    if (!validation.isValid || !validation.data) {
      return res.status(422).json({
        success: false,
        message: 'File tidak dapat diproses karena tidak memenuhi struktur dataset yang valid.',
        errors: validation.errors || ['Gagal memvalidasi struktur berkas.'],
      });
    }

    // Save file to private persistent volume as normalized CSV
    const dataset_id = crypto.randomUUID();
    const stored_filename = `${dataset_id}.csv`;
    const storage_path = path.join(UPLOAD_DIR, stored_filename);

    try {
      fs.writeFileSync(storage_path, Buffer.from(rawContent, 'utf-8'));
    } catch (saveErr) {
      console.error('Failed to write file to private storage:', saveErr);
    }

    const record: StoredDataset = {
      dataset_id,
      original_filename: originalFilename,
      stored_filename,
      file_size_bytes: fileSize,
      total_rows: validation.data.total_rows,
      total_columns: validation.data.total_columns,
      columns: validation.data.columns,
      column_details: validation.data.column_details,
      missing_values_total: validation.data.missing_values_total,
      missing_values_by_column: validation.data.missing_values_by_column,
      duplicate_rows: validation.data.duplicate_rows,
      problematic_rows: validation.data.problematic_rows,
      problematic_rows_count: validation.data.problematic_rows_count,
      validation_status: validation.data.validation_status as any,
      warnings: validation.data.warnings,
      preview: validation.data.preview,
      uploaded_at: new Date().toISOString(),
      smiles_column_detected: validation.data.smiles_column_detected,
      smiles_column_name: validation.data.smiles_column_name,
    };

    datasetStore.set(dataset_id, record);

    return res.status(200).json({
      success: true,
      message: 'Dataset uploaded and validated successfully',
      data: {
        dataset_id: record.dataset_id,
        filename: record.original_filename,
        file_size_bytes: record.file_size_bytes,
        total_rows: record.total_rows,
        total_columns: record.total_columns,
        columns: record.columns,
        column_details: record.column_details,
        missing_values_total: record.missing_values_total,
        missing_values_by_column: record.missing_values_by_column,
        duplicate_rows: record.duplicate_rows,
        problematic_rows: record.problematic_rows,
        problematic_rows_count: record.problematic_rows_count,
        validation_status: record.validation_status,
        warnings: record.warnings,
        preview: record.preview,
        uploaded_at: record.uploaded_at,
        smiles_column_detected: record.smiles_column_detected,
        smiles_column_name: record.smiles_column_name,
      },
    });
  });
});

// 12.3 GET /api/v1/datasets/:id
app.get('/api/v1/datasets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let ds = datasetStore.get(id);

  // If not found in memory or missing problematic_rows, restore from disk storage
  if (!ds || !ds.problematic_rows || (ds.duplicate_rows > 0 && ds.problematic_rows.length === 0)) {
    const filePath = path.join(UPLOAD_DIR, `${id}.csv`);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const originalName = ds?.original_filename || 'dataset.csv';
        const validation = validateCsvContent(fileContent, originalName, stats.size);
        if (validation.isValid && validation.data) {
          const restored: StoredDataset = {
            dataset_id: id,
            original_filename: originalName,
            stored_filename: `${id}.csv`,
            file_size_bytes: stats.size,
            total_rows: validation.data.total_rows,
            total_columns: validation.data.total_columns,
            columns: validation.data.columns,
            column_details: validation.data.column_details,
            missing_values_total: validation.data.missing_values_total,
            missing_values_by_column: validation.data.missing_values_by_column,
            duplicate_rows: validation.data.duplicate_rows,
            problematic_rows: validation.data.problematic_rows,
            problematic_rows_count: validation.data.problematic_rows_count,
            validation_status: validation.data.validation_status as any,
            warnings: validation.data.warnings,
            preview: validation.data.preview,
            uploaded_at: ds?.uploaded_at || new Date().toISOString(),
            smiles_column_detected: validation.data.smiles_column_detected,
            smiles_column_name: validation.data.smiles_column_name,
            qsar_predictions: ds?.qsar_predictions,
          };
          datasetStore.set(id, restored);
          ds = restored;
        }
      } catch (err) {
        console.error('Failed to restore dataset from disk on GET:', err);
      }
    }
  }

  if (!ds) {
    return res.status(404).json({
      success: false,
      message: 'Dataset tidak ditemukan atau telah kedaluwarsa.',
      errors: ['Dataset ID tidak valid.'],
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Dataset metadata retrieved successfully',
    data: {
      dataset_id: ds.dataset_id,
      filename: ds.original_filename,
      file_size_bytes: ds.file_size_bytes,
      total_rows: ds.total_rows,
      total_columns: ds.total_columns,
      columns: ds.columns,
      column_details: ds.column_details,
      missing_values_total: ds.missing_values_total,
      missing_values_by_column: ds.missing_values_by_column,
      duplicate_rows: ds.duplicate_rows,
      problematic_rows: ds.problematic_rows,
      problematic_rows_count: ds.problematic_rows_count,
      validation_status: ds.validation_status,
      warnings: ds.warnings,
      preview: ds.preview,
      uploaded_at: ds.uploaded_at,
      smiles_column_detected: ds.smiles_column_detected,
      smiles_column_name: ds.smiles_column_name,
    },
  });
});

// GET /api/v1/datasets/:id/issues
app.get('/api/v1/datasets/:id/issues', (req: Request, res: Response) => {
  const { id } = req.params;
  let ds = datasetStore.get(id);

  if (!ds || !ds.problematic_rows || (ds.duplicate_rows > 0 && ds.problematic_rows.length === 0)) {
    const filePath = path.join(UPLOAD_DIR, `${id}.csv`);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const originalName = ds?.original_filename || 'dataset.csv';
        const validation = validateCsvContent(fileContent, originalName, stats.size);
        if (validation.isValid && validation.data) {
          const restored: StoredDataset = {
            dataset_id: id,
            original_filename: originalName,
            stored_filename: `${id}.csv`,
            file_size_bytes: stats.size,
            total_rows: validation.data.total_rows,
            total_columns: validation.data.total_columns,
            columns: validation.data.columns,
            column_details: validation.data.column_details,
            missing_values_total: validation.data.missing_values_total,
            missing_values_by_column: validation.data.missing_values_by_column,
            duplicate_rows: validation.data.duplicate_rows,
            problematic_rows: validation.data.problematic_rows,
            problematic_rows_count: validation.data.problematic_rows_count,
            validation_status: validation.data.validation_status as any,
            warnings: validation.data.warnings,
            preview: validation.data.preview,
            uploaded_at: ds?.uploaded_at || new Date().toISOString(),
            smiles_column_detected: validation.data.smiles_column_detected,
            smiles_column_name: validation.data.smiles_column_name,
            qsar_predictions: ds?.qsar_predictions,
          };
          datasetStore.set(id, restored);
          ds = restored;
        }
      } catch (err) {
        console.error('Failed to restore dataset from disk on GET issues:', err);
      }
    }
  }

  if (!ds) {
    return res.status(404).json({
      success: false,
      message: 'Dataset tidak ditemukan.',
      errors: ['Dataset ID tidak valid.'],
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      problematic_rows: ds.problematic_rows || [],
      problematic_rows_count: ds.problematic_rows?.length || 0,
      duplicate_rows: ds.duplicate_rows,
      missing_values_total: ds.missing_values_total,
    },
  });
});

// 12.4 GET /api/v1/datasets/:id/preview
app.get('/api/v1/datasets/:id/preview', (req: Request, res: Response) => {
  const { id } = req.params;
  const ds = datasetStore.get(id);
  if (!ds) {
    return res.status(404).json({
      success: false,
      message: 'Dataset tidak ditemukan.',
      errors: ['Dataset ID tidak valid.'],
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Dataset preview retrieved successfully',
    data: {
      dataset_id: ds.dataset_id,
      preview: ds.preview,
    },
  });
});

// POST /api/v1/datasets/:id/predict
app.post('/api/v1/datasets/:id/predict', express.json(), async (req: Request, res: Response) => {
  const { id } = req.params;
  const smilesCol = req.body?.smiles_column || (req.query?.smiles_column as string) || undefined;
  const ds = datasetStore.get(id);
  if (!ds) {
    return res.status(404).json({
      success: false,
      message: 'Dataset tidak ditemukan atau sesi telah kedaluwarsa.',
      errors: ['Dataset ID tidak valid.'],
    });
  }

  const inputCsvPath = path.join(UPLOAD_DIR, ds.stored_filename);
  if (!fs.existsSync(inputCsvPath)) {
    return res.status(404).json({
      success: false,
      message: 'File dataset fisik tidak ditemukan di server.',
      errors: ['File CSV hilang dari media penyimpanan.'],
    });
  }

  const outputCsvPath = path.join(UPLOAD_DIR, `${id}_qsar_predictions.csv`);

  try {
    const result = await runQsarPredictionScript(inputCsvPath, outputCsvPath, smilesCol);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: 'Gagal menjalankan inferensi model QSAR.',
        errors: [result.error || 'Terjadi kesalahan saat memproses molekul.'],
      });
    }

    ds.qsar_predictions = result;

    return res.status(200).json({
      success: true,
      message: 'Prediksi QSAR IDH1 berhasil diselesaikan.',
      data: result,
    });
  } catch (err: any) {
    console.error('[QSAR Prediction Exception]:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat mengeksekusi model QSAR.',
      errors: [err.message || 'Eksekusi script QSAR gagal.'],
    });
  }
});

// GET /api/v1/datasets/:id/predictions
app.get('/api/v1/datasets/:id/predictions', async (req: Request, res: Response) => {
  const { id } = req.params;
  const ds = datasetStore.get(id);
  if (!ds) {
    return res.status(404).json({
      success: false,
      message: 'Dataset tidak ditemukan.',
      errors: ['Dataset ID tidak valid.'],
    });
  }

  if (ds.qsar_predictions) {
    return res.status(200).json({
      success: true,
      message: 'Hasil prediksi QSAR IDH1 ditemukan.',
      data: ds.qsar_predictions,
    });
  }

  // Not predicted yet, try executing prediction
  const inputCsvPath = path.join(UPLOAD_DIR, ds.stored_filename);
  if (!fs.existsSync(inputCsvPath)) {
    return res.status(404).json({
      success: false,
      message: 'File dataset tidak ditemukan.',
      errors: ['File tidak ada di disk.'],
    });
  }

  const outputCsvPath = path.join(UPLOAD_DIR, `${id}_qsar_predictions.csv`);
  try {
    const result = await runQsarPredictionScript(inputCsvPath, outputCsvPath);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: 'Gagal memprediksi data.',
        errors: [result.error || 'Gagal memproses molekul.'],
      });
    }
    ds.qsar_predictions = result;
    return res.status(200).json({
      success: true,
      message: 'Prediksi berhasil dibuat.',
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menjalankan prediksi.',
      errors: [err.message],
    });
  }
});

// GET /api/v1/datasets/:id/predictions/download
app.get('/api/v1/datasets/:id/predictions/download', async (req: Request, res: Response) => {
  const { id } = req.params;
  const ds = datasetStore.get(id);
  if (!ds) {
    return res.status(404).send('Dataset tidak ditemukan');
  }

  const outputCsvPath = path.join(UPLOAD_DIR, `${id}_qsar_predictions.csv`);
  if (!fs.existsSync(outputCsvPath)) {
    // Generate it
    const inputCsvPath = path.join(UPLOAD_DIR, ds.stored_filename);
    if (fs.existsSync(inputCsvPath)) {
      try {
        await runQsarPredictionScript(inputCsvPath, outputCsvPath);
      } catch (err) {
        return res.status(500).send('Gagal membuat file hasil prediksi.');
      }
    }
  }

  if (!fs.existsSync(outputCsvPath)) {
    return res.status(404).send('File hasil prediksi belum tersedia.');
  }

  const baseName = ds.original_filename.replace(/\.(csv|xlsx|xls)$/i, '');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}_idh1_predictions.csv"`);
  return res.sendFile(outputCsvPath);
});

// GET /api/v1/samples
app.get('/api/v1/samples', (req: Request, res: Response) => {
  const list = SAMPLE_METADATA.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    filename: s.filename,
  }));
  return res.status(200).json({ success: true, samples: list });
});

// GET /api/v1/samples/:id/download
app.get('/api/v1/samples/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const sample = SAMPLE_METADATA.find((s) => s.id === id);
  if (!sample) {
    return res.status(404).send('Sample not found');
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${sample.filename}"`);
  return res.send(sample.content);
});

// Integration with Vite in Development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QSAR Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[QSAR Server] Failed to start:', err);
  process.exit(1);
});
