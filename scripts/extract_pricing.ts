
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';

const SHEET_DIR = path.join(process.cwd(), '.next/Costing Sheets');
const EXCHANGE_RATE_NAD_TO_USD = 0.053; // Approx 1 NAD = 0.053 USD (1 USD = ~18.8 NAD)
const DEFAULT_EXCHANGE_RATE = 19; // 1 USD = 19 NAD 

// Categories to classify tours
const CATEGORIES = [
    'Self Drive',
    'Fly In',
    'Private Guided',
    'Guided',
    'Family',
    'Honeymoon',
    'Camping'
];

async function main() {
    console.log('Searching for Excel files in:', SHEET_DIR);

    // Find all xlsx and xls files recursively
    const files = await glob('**/*.{xlsx,xls}', { cwd: SHEET_DIR, absolute: true });
    console.log(`Found ${files.length} files.`);

    const prices: { category: string; priceUSD: number; file: string; currency: string }[] = [];

    for (const file of files) {
        // Skip temporary files
        if (path.basename(file).startsWith('~$')) continue;

        try {
            const workbook = XLSX.readFile(file);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            let foundTotal = false;
            let price = 0;

            // Heuristic: Look for "TOTAL" or "Grand Total"
            // Based on inspection: "TOTAL" is in Col K (idx 10), Value in Col N (idx 13)
            for (const row of data) {
                if (!row) continue;

                // key cells often at index 10 or 11
                const cellK = row[10];
                const cellL = row[11];

                if (typeof cellK === 'string' && cellK.toUpperCase().includes('TOTAL')) {
                    const extracted = row[13]; // Column N
                    if (typeof extracted === 'number') {
                        price = extracted;
                        foundTotal = true;
                        break;
                    }
                }
            }

            if (!foundTotal || price === 0) continue;

            // Classify
            const folderName = path.dirname(file).split(path.sep).pop() || '';
            const fileName = path.basename(file);
            const context = `${folderName} ${fileName}`.toLowerCase();

            let category = 'Classic Safari'; // Default
            for (const cat of CATEGORIES) {
                if (context.includes(cat.toLowerCase())) {
                    category = cat;
                    break;
                }
            }

            // Detect Currency
            let currency = 'NAD';
            if (context.includes('bots') || context.includes('botswana') || context.includes('vic falls') || context.includes('zimbabwe')) {
                currency = 'USD';
            }

            // Convert
            let priceUSD = price;
            if (currency === 'NAD') {
                priceUSD = price / DEFAULT_EXCHANGE_RATE;
            }

            // Filter reasonable range (ignore empty or placeholder zeroes, or huge outliers)
            if (priceUSD > 500 && priceUSD < 100000) {
                prices.push({ category, priceUSD, file: folderName, currency });
            }

        } catch (err) {
            console.warn(`Error reading ${path.basename(file)}:`, err);
        }
    }

    // Calculate Averages
    const summary: Record<string, { count: number, avgPrice: number, min: number, max: number }> = {};

    for (const p of prices) {
        if (!summary[p.category]) {
            summary[p.category] = { count: 0, avgPrice: 0, min: Infinity, max: 0 };
        }
        summary[p.category].count++;
        summary[p.category].avgPrice += p.priceUSD;
        summary[p.category].min = Math.min(summary[p.category].min, p.priceUSD);
        summary[p.category].max = Math.max(summary[p.category].max, p.priceUSD);
    }

    // Finalize averages
    for (const cat in summary) {
        summary[cat].avgPrice = Math.round(summary[cat].avgPrice / summary[cat].count);
        summary[cat].min = Math.round(summary[cat].min);
        summary[cat].max = Math.round(summary[cat].max);
    }

    console.log('--- PRICING ANALYSIS ---');
    console.table(summary);

    // Save to file
    const outputPath = path.join(process.cwd(), 'data/pricing.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`Saved pricing data to ${outputPath}`);
}

main();
