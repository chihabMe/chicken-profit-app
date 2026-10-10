/**
 * Free Facebook Poultry Scraper & Parser for Algerian Markets
 * No paid Apify subscription needed.
 */
import fs from 'fs';
import path from 'path';

// Valid market cities to extract
const TARGET_REGIONS = [
  { name: 'شلغوم', patterns: [/شلغوم/i] },
  { name: 'العلمة', patterns: [/العلمة/i] },
  { name: 'ميلة وماجاورها', patterns: [/ميلة/i] },
  { name: 'البرج', patterns: [/البرج/i] }
];

export interface ScrapedRecord {
  dateFormatted: string; // YYYY-MM-DD
  dateLooker: string;    // YYYYMMDD
  cityRegion: string;
  priceCentimes: string; // e.g. "23500" or "23500/24000"
  sourceUrl: string;
  postId: string;
  scrapedAt: string;
}

/**
 * Extracts prices and regions from raw Arabic post text
 */
export function parsePoultryPostText(
  postText: string,
  postDate: string,
  postId: string,
  sourceUrl: string
): ScrapedRecord[] {
  const records: ScrapedRecord[] = [];
  const dateFormatted = postDate.slice(0, 10);
  const dateLooker = dateFormatted.replace(/-/g, '');
  const nowIso = new Date().toISOString();

  // Split by line or common punctuation
  const lines = postText.split(/[\n\r]+/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for each known region
    for (const region of TARGET_REGIONS) {
      if (region.patterns.some(p => p.test(trimmed))) {
        // Find price numbers (typically 4-5 digits, e.g. 23500, 35000, 280, or ranges 23500/24000)
        const priceMatch = trimmed.match(/(\d{4,5}(?:\s*[\/\-]\s*\d{4,5})?|\d{2,3}(?:\s*[\/\-]\s*\d{2,3})?)/);
        if (priceMatch) {
          let priceStr = priceMatch[1].replace(/\s+/g, '');
          
          // If price is written in DZD instead of centimes (e.g. "350" or "350/360"), convert to centimes
          if (!priceStr.includes('/') && parseInt(priceStr, 10) < 1000) {
            priceStr = (parseInt(priceStr, 10) * 100).toString();
          }

          records.push({
            dateFormatted,
            dateLooker,
            cityRegion: region.name,
            priceCentimes: priceStr,
            sourceUrl,
            postId,
            scrapedAt: nowIso
          });
        }
      }
    }
  }

  return records;
}

/**
 * Appends new records to public/prices.csv while preventing duplicate postIds
 */
export function appendRecordsToCsv(records: ScrapedRecord[], csvPath: string): number {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const existingContent = fs.readFileSync(csvPath, 'utf8');
  const existingLines = existingContent.split('\n');
  const existingPostIds = new Set<string>();

  for (const line of existingLines) {
    const parts = line.split(',');
    if (parts.length >= 6 && parts[5]) {
      existingPostIds.add(parts[5].trim());
    }
  }

  let addedCount = 0;
  const linesToAppend: string[] = [];

  for (const r of records) {
    // Only check duplication if it's the same post AND same city
    const key = `${r.postId}_${r.cityRegion}`;
    if (!existingPostIds.has(key)) {
      linesToAppend.push(
        `${r.dateFormatted},${r.dateLooker},${r.cityRegion},${r.priceCentimes},${r.sourceUrl},${r.postId},${r.scrapedAt}`
      );
      existingPostIds.add(key);
      addedCount++;
    }
  }

  if (linesToAppend.length > 0) {
    // Ensure trailing newline before appending
    const prefix = existingContent.endsWith('\n') ? '' : '\n';
    fs.appendFileSync(csvPath, prefix + linesToAppend.join('\n') + '\n', 'utf8');
  }

  return addedCount;
}
