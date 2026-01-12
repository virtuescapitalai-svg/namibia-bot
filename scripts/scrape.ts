
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://secretnamibia.com';
const URLS_TO_SCRAPE = [
  '/',
  '/safaris',
  '/about',
  '/enquiries', // based on subagent findings
  '/tours',
  '/contact',
  '/destinations',
];

interface PageData {
  url: string;
  title: string;
  content: string;
}

async function scrapeUrl(urlPath: string): Promise<PageData | null> {
  const fullUrl = `${BASE_URL}${urlPath}`;
  console.log(`Scraping ${fullUrl}...`);
  try {
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch ${fullUrl}: ${response.status}`);
      return null;
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, and other noise
    $('script, style, noscript, svg, iframe, footer, nav').remove();

    const title = $('title').text().trim() || urlPath;
    
    // Extract logical content sections
    let content = '';
    $('h1, h2, h3, p, li').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) { // Filter out short snippets like "Menu"
            content += text + '\n\n';
        }
    });

    return {
      url: fullUrl,
      title,
      content: content.trim(),
    };
  } catch (error) {
    console.error(`Error scraping ${fullUrl}:`, error);
    return null;
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const results: PageData[] = [];
  
  for (const urlPath of URLS_TO_SCRAPE) {
    const data = await scrapeUrl(urlPath);
    if (data) {
      results.push(data);
    }
    // Polite delay
    await new Promise(r => setTimeout(r, 1000));
  }

  const outputPath = path.join(dataDir, 'knowledge.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Scraping complete. Saved ${results.length} pages to ${outputPath}`);
}

main();
