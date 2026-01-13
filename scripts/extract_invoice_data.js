
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const glob = require('glob');

const INVOICE_DIR = path.join(process.cwd(), 'past invoices');
const OUTPUT_FILE = path.join(process.cwd(), 'data/invoice_pricing.json');

// Exchange Rate (Conservative avg)
const NAD_TO_USD = 0.053; // 1 NAD = ~0.053 USD

async function main() {
    console.log('Scanning invoices in:', INVOICE_DIR);
    const files = glob.sync('**/*.pdf', { cwd: INVOICE_DIR, absolute: true });

    const results = [];

    for (const file of files) {
        try {
            const dataBuffer = fs.readFileSync(file);
            const data = await pdf(dataBuffer);
            const text = data.text;

            // 1. Detect Currency
            let currency = 'NAD'; // Default
            if (text.includes('USD') || text.includes('US$')) {
                currency = 'USD';
            }

            // 2. Extract description (Simple heuristic: look for "Day" and "Safari" or "Tour")
            // The text is messy, e.g. "16 Da16 Day Namibia Safy Namibia Safariari"
            // We look for patterns like "(\d+) Day"
            const dayMatch = text.match(/(\d+)\s*Day/i);
            const days = dayMatch ? parseInt(dayMatch[1]) : 0;

            let name = 'Custom Safari';
            if (days > 0) {
                // Try to grab the line with the days
                const lines = text.split('\n');
                const nameLine = lines.find(l => l.includes(`${days} Day`));
                if (nameLine) {
                    // Clean up the messy double text if possible, or just take a clean substring
                    // "16 Da16 Day Namibia Safy Namibia Safariari" -> "16 Day Namibia Safari"
                    // This is hard to perfect safely, so we might just canonicalize it:
                    name = `${days} Day Namibia Safari`;
                    if (text.toLowerCase().includes('fly-in') || text.toLowerCase().includes('fly in')) {
                        name += ' (Fly-In)';
                    } else if (text.toLowerCase().includes('self drive')) {
                        name += ' (Self-Drive)';
                    } else if (text.toLowerCase().includes('guided')) {
                        name += ' (Guided)';
                    }
                }
            }

            // 3. Extract Price
            // Look for large numbers.
            // Format: $284,350.00 or 284,350.00
            const numberPattern = /[\$]?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
            const numbers = [];
            let match;
            while ((match = numberPattern.exec(text)) !== null) {
                // Remove commas and $
                const raw = match[1].replace(/,/g, '');
                const val = parseFloat(raw);
                if (!isNaN(val)) numbers.push(val);
            }

            // Heuristics:
            // "Total" is usually the biggest number.
            // "Rate" is usually appearing before Total or is Total / Pax.
            // In the example: Rate: 284,350, Total: 568,700.
            // We want Per Person Rate.

            // Sort unique numbers descending
            const unique = [...new Set(numbers)].sort((a, b) => b - a);

            // If we have > 1 big number, the biggest is likely Total, second biggest might be Rate/Balance.
            // If Text contains "PAX" followed by a small number (e.g. 2, 4), we can calculate matches.

            let rate = 0;
            if (unique.length > 0) {
                // Assume the max is Total.
                // If there's a number that is exactly Max / 2, Max / 4, etc, that's the Rate.
                const total = unique[0];

                // Look for other large numbers that divide the total
                for (let i = 1; i < unique.length; i++) {
                    const val = unique[i];
                    if (val > 1000) { // filter out dates/small ints
                        const ratio = total / val;
                        // If ratio is roughly an integer (2, 3, 4 persons)
                        if (Math.abs(ratio - Math.round(ratio)) < 0.05 && ratio < 20) {
                            rate = val;
                            break;
                        }
                    }
                }

                // Fallback: If no divisor found, maybe the Total IS the rate (1 pax), 
                // OR the text layout was weird. 
                // Let's rely on the fact that these are high-value invoices.
                if (rate === 0) rate = total; // Conservative assumption: Quote is for 1 pax if undefined? No, dangerous.

                // Better fallback: Invoice usually lists Rate per person. 
                // In the sample: "$284,350.00 2 $568,700.00"
                // The numbers found would be 284350, 2, 568700.
                // 284350 * 2 = 568700. So we found it.
            }

            // Convert to USD
            let finalUsd = rate;
            if (currency === 'NAD') {
                finalUsd = rate * NAD_TO_USD;
            }

            // Filter reasonable Safari prices (e.g. $1000 to $50,000)
            if (finalUsd > 1000 && finalUsd < 60000) {
                results.push({
                    file: path.basename(file),
                    name,
                    days,
                    currency,
                    originalRate: rate,
                    usdRate: Math.round(finalUsd)
                });
            }

        } catch (err) {
            // ignore bad files
        }
    }

    // Aggregate
    const summary = {}; // "11 Day": { count, avg, min, max }

    for (const r of results) {
        const key = r.name;
        if (!summary[key]) summary[key] = { count: 0, sum: 0, min: 999999, max: 0, prices: [] };

        summary[key].count++;
        summary[key].sum += r.usdRate;
        summary[key].min = Math.min(summary[key].min, r.usdRate);
        summary[key].max = Math.max(summary[key].max, r.usdRate);
        summary[key].prices.push(r.usdRate);
    }

    // Finalize
    const cleanSummary = [];
    for (const [key, val] of Object.entries(summary)) {
        cleanSummary.push({
            tour: key,
            avg: Math.round(val.sum / val.count),
            range: `$${Math.round(val.min)} - $${Math.round(val.max)}`,
            count: val.count
        });
    }

    // Sort by name
    cleanSummary.sort((a, b) => a.tour.localeCompare(b.tour));

    console.log(JSON.stringify(cleanSummary, null, 2));
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanSummary, null, 2));
}

main();
