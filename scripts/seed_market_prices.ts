import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function parsePrice(raw: string): number {
  if (raw.includes('/')) {
    const parts = raw.split('/').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    if (parts.length === 0) return 0;
    const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
    return avg > 1000 ? avg / 100 : avg;
  }
  const val = parseFloat(raw.trim());
  if (isNaN(val)) return 0;
  return val > 1000 ? val / 100 : val;
}

async function seedMarketPrices() {
  console.log('Reading public/prices.csv...');
  const csvPath = path.resolve('public/prices.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  const header = lines[0];
  console.log('Header:', header);
  console.log(`Total data rows: ${lines.length - 1}`);

  const rowsToInsert = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const date = cols[0]?.trim();
    const dateLooker = cols[1]?.trim() || null;
    const region = cols[2]?.trim();
    const priceCentimes = cols[3]?.trim();
    const sourceUrl = cols[4]?.trim() || null;
    const postId = cols[5]?.trim() || null;
    const scrapedAt = cols[6]?.trim() || null;

    if (!date || !region || !priceCentimes) {
      console.warn(`Skipping invalid row ${i}:`, lines[i]);
      continue;
    }

    const priceDzd = parsePrice(priceCentimes);

    rowsToInsert.push({
      date,
      dateLooker,
      region,
      priceDzd,
      priceCentimes,
      sourceUrl,
      postId,
      scrapedAt,
    });
  }

  console.log(`Parsed ${rowsToInsert.length} valid rows.`);

  // Check current count in DB
  const existingRows = await db.select().from(schema.marketPrices);
  console.log(`Existing rows in market_prices table: ${existingRows.length}`);

  if (existingRows.length > 0) {
    console.log('Clearing existing rows in market_prices table before clean seed...');
    // Clear to ensure idempotent clean state
    await db.delete(schema.marketPrices);
  }

  // Batch insert into Neon DB in chunks of 200
  const CHUNK_SIZE = 200;
  console.log(`Inserting ${rowsToInsert.length} rows in chunks of ${CHUNK_SIZE}...`);

  for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(schema.marketPrices).values(chunk);
    console.log(`Inserted rows ${i + 1} to ${Math.min(i + CHUNK_SIZE, rowsToInsert.length)}`);
  }

  const finalRows = await db.select().from(schema.marketPrices);
  console.log(`✅ Successfully seeded market_prices table! Final DB count: ${finalRows.length} rows.`);

  // Sample check
  const latestRow = finalRows.find(r => r.date === '2026-10-07');
  console.log('Sample verified latest row from DB:', latestRow);

  process.exit(0);
}

seedMarketPrices().catch(err => {
  console.error('Error seeding market prices:', err);
  process.exit(1);
});
