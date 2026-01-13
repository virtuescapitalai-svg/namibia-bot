
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.join(process.cwd(), '.next/Costing Sheets/00_Costing_Sheet/Safari-Costing-Sheet-2025.xlsx');

console.log('Reading file:', filePath);

if (!fs.existsSync(filePath)) {
    console.error('File not found');
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Dump first 20 rows to see structure
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 30);
console.log(JSON.stringify(data, null, 2));
