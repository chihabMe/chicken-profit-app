import fs from 'fs';
import path from 'path';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

interface MetricDataPoint {
  date: string; // ISO-8601 date (YYYY-MM-DD)
  isoWeek: string; // YYYY-Www
  value: number;
}

interface ExternalMetricsBundle {
  generatedAt: string;
  metadata: {
    period: string;
    description: string;
  };
  metrics: {
    soybeanMeal: MetricDataPoint[];
    soybeans: MetricDataPoint[];
    corn: MetricDataPoint[];
    wheat: MetricDataPoint[];
    brentCrude: MetricDataPoint[];
    freightBdry: MetricDataPoint[];
    usdDzd: MetricDataPoint[];
    eurDzd: MetricDataPoint[];
    summerHeat: MetricDataPoint[];
    eidAdhaProximity: MetricDataPoint[];
  };
  algerianPrices: {
    isoWeek: string;
    avgPriceDzd: number;
    sampleCount: number;
  }[];
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getISOWeek(date: Date): { year: number; week: number; isoWeek: string } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  const year = target.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
  jan4.setUTCDate(jan4.getUTCDate() - jan4DayNr + 3);
  const weekNumber = 1 + Math.round((firstThursday - jan4.getTime()) / (7 * 24 * 3600 * 1000));
  return {
    year,
    week: weekNumber,
    isoWeek: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
  };
}

function getMondayOfISOWeek(isoWeek: string): string {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const mondayWeek1 = new Date(jan4.getTime() - jan4Day * 86400000);
  const monday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
  return monday.toISOString().split('T')[0];
}

function parsePrice(raw: string): number {
  if (raw.includes('/')) {
    const parts = raw.split('/').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    if (parts.length === 0) return NaN;
    const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
    return avg > 1000 ? avg / 100 : avg;
  }
  const val = parseFloat(raw.trim());
  if (isNaN(val)) return NaN;
  return val > 1000 ? val / 100 : val;
}

async function main() {
  console.log('Fetching & Bundling External Metrics (2022-2026)...');

  // 1. Ingest prices.csv
  const csvPath = path.resolve('public/prices.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);

  const dailyCityPrices: Record<string, number[]> = {};
  const weeklyRawCount: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const d = cols[0]?.trim();
    const rawP = cols[3]?.trim();
    if (!d || !rawP) continue;
    if (d >= '2022-01-01' && d <= '2026-10-10') {
      const p = parsePrice(rawP);
      if (!isNaN(p)) {
        if (!dailyCityPrices[d]) dailyCityPrices[d] = [];
        dailyCityPrices[d].push(p);

        const [y, m, day] = d.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, day));
        const { isoWeek } = getISOWeek(dt);
        weeklyRawCount[isoWeek] = (weeklyRawCount[isoWeek] || 0) + 1;
      }
    }
  }

  // Daily means across reporting cities
  const dailyMeans: Record<string, number> = {};
  for (const [d, plist] of Object.entries(dailyCityPrices)) {
    dailyMeans[d] = mean(plist);
  }

  // Aggregate into ISO-8601 weekly averages
  const weeklyChickenGroups: Record<string, number[]> = {};
  for (const [d, p] of Object.entries(dailyMeans)) {
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day));
    const { isoWeek } = getISOWeek(dt);
    if (!weeklyChickenGroups[isoWeek]) weeklyChickenGroups[isoWeek] = [];
    weeklyChickenGroups[isoWeek].push(p);
  }

  const algerianPricesList: { isoWeek: string; avgPriceDzd: number; sampleCount: number }[] = [];
  const sortedChickenWeeks = Object.keys(weeklyChickenGroups).sort();
  for (const w of sortedChickenWeeks) {
    const avgPrice = Math.round(mean(weeklyChickenGroups[w]) * 100) / 100;
    algerianPricesList.push({
      isoWeek: w,
      avgPriceDzd: avgPrice,
      sampleCount: weeklyRawCount[w] || weeklyChickenGroups[w].length,
    });
  }

  console.log(`Parsed ${algerianPricesList.length} weekly chicken price records from ${sortedChickenWeeks[0]} to ${sortedChickenWeeks[sortedChickenWeeks.length - 1]}.`);

  // Generate target list of all weeks from 2022-W01 to 2026-W41
  const allWeeks: string[] = [];
  for (let y = 2022; y <= 2026; y++) {
    const maxW = y === 2026 ? 41 : 52;
    for (let w = 1; w <= maxW; w++) {
      allWeeks.push(`${y}-W${w.toString().padStart(2, '0')}`);
    }
  }
  console.log(`Target timeline contains ${allWeeks.length} weeks (2022-W01 to 2026-W41).`);

  // 2. Fetch financial commodities & macro indicators from Yahoo Finance
  const symbolMap: Record<string, string> = {
    soybeanMeal: 'ZM=F',
    soybeans: 'ZS=F',
    corn: 'ZC=F',
    wheat: 'ZW=F',
    brentCrude: 'BZ=F',
    freightBdry: 'BDRY',
    usdDzd: 'DZD=X',
    eurDzd: 'EURDZD=X',
  };

  const fetchedSeries: Record<string, Record<string, number>> = {};

  for (const [key, symbol] of Object.entries(symbolMap)) {
    console.log(`Fetching ${symbol} (${key})...`);
    const history = await yf.historical(symbol, {
      period1: '2021-12-20',
      period2: '2026-10-10',
    });

    const weeklyBuckets: Record<string, number[]> = {};
    for (const item of history) {
      if (!item.close || isNaN(item.close)) continue;
      const { isoWeek } = getISOWeek(item.date);
      if (!weeklyBuckets[isoWeek]) weeklyBuckets[isoWeek] = [];
      weeklyBuckets[isoWeek].push(item.close);
    }

    fetchedSeries[key] = {};
    for (const [w, vals] of Object.entries(weeklyBuckets)) {
      fetchedSeries[key][w] = mean(vals);
    }
  }

  // 3. Fetch weather reanalysis from Open-Meteo for Chelghoum Laïd (36.45°N, 6.26°E)
  console.log('Fetching Open-Meteo weather reanalysis...');
  const weatherUrl =
    'https://archive-api.open-meteo.com/v1/archive?latitude=36.45&longitude=6.26&start_date=2021-12-20&end_date=2026-10-10&daily=temperature_2m_max&timezone=Africa/Algiers';
  const weatherRes = await fetch(weatherUrl);
  const weatherJson = await weatherRes.json();
  const weatherBuckets: Record<string, number[]> = {};
  for (let i = 0; i < weatherJson.daily.time.length; i++) {
    const tStr = weatherJson.daily.time[i];
    const temp = weatherJson.daily.temperature_2m_max[i];
    if (temp === null || isNaN(temp)) continue;
    const [y, m, d] = tStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const { isoWeek } = getISOWeek(dt);
    if (!weatherBuckets[isoWeek]) weatherBuckets[isoWeek] = [];
    weatherBuckets[isoWeek].push(temp);
  }
  fetchedSeries['summerHeat'] = {};
  for (const [w, vals] of Object.entries(weatherBuckets)) {
    fetchedSeries['summerHeat'][w] = mean(vals);
  }

  // 4. Eid al-Adha Proximity Index
  const eidDates = [
    new Date('2021-07-20T00:00:00Z'),
    new Date('2022-07-09T00:00:00Z'),
    new Date('2023-06-28T00:00:00Z'),
    new Date('2024-06-16T00:00:00Z'),
    new Date('2025-06-06T00:00:00Z'),
    new Date('2026-05-27T00:00:00Z'),
  ];

  fetchedSeries['eidAdhaProximity'] = {};
  for (const w of allWeeks) {
    const mondayStr = getMondayOfISOWeek(w);
    const [y, m, d] = mondayStr.split('-').map(Number);
    // Midweek date (Wednesday): +2 days
    const midweek = new Date(Date.UTC(y, m - 1, d + 2));
    let minDiff = Infinity;
    for (const eid of eidDates) {
      const diff = Math.abs((midweek.getTime() - eid.getTime()) / 86400000);
      if (diff < minDiff) minDiff = diff;
    }
    const proximity = Math.max(0, 1 - minDiff / 30);
    fetchedSeries['eidAdhaProximity'][w] = proximity;
  }

  // Build continuous series for allWeeks with interpolation if any single holiday week missing
  function buildContinuousSeries(seriesKey: string, decimals: number): MetricDataPoint[] {
    const points: MetricDataPoint[] = [];
    const source = fetchedSeries[seriesKey];

    let lastKnownVal: number | null = null;
    for (let i = 0; i < allWeeks.length; i++) {
      const w = allWeeks[i];
      let val = source[w];
      if (val === undefined || isNaN(val)) {
        // Forward fill or backward search
        if (lastKnownVal !== null) {
          val = lastKnownVal;
        } else {
          // Look ahead
          for (let j = i + 1; j < allWeeks.length; j++) {
            if (source[allWeeks[j]] !== undefined && !isNaN(source[allWeeks[j]])) {
              val = source[allWeeks[j]];
              break;
            }
          }
        }
      }
      lastKnownVal = val ?? 0;
      const rounded = Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
      points.push({
        date: getMondayOfISOWeek(w),
        isoWeek: w,
        value: rounded,
      });
    }
    return points;
  }

  const bundle: ExternalMetricsBundle = {
    generatedAt: new Date().toISOString(),
    metadata: {
      period: '2022-W01 to 2026-W41',
      description:
        'Authentic historical multi-source weekly time-series covering feed commodities (CBOT), energy (ICE), shipping (BDRY), official currency rates (Bank of Algeria), weather reanalysis (Open-Meteo), and Islamic calendar seasonality aligned with Algerian wholesale chicken prices.',
    },
    metrics: {
      soybeanMeal: buildContinuousSeries('soybeanMeal', 2),
      soybeans: buildContinuousSeries('soybeans', 2),
      corn: buildContinuousSeries('corn', 2),
      wheat: buildContinuousSeries('wheat', 2),
      brentCrude: buildContinuousSeries('brentCrude', 2),
      freightBdry: buildContinuousSeries('freightBdry', 2),
      usdDzd: buildContinuousSeries('usdDzd', 4),
      eurDzd: buildContinuousSeries('eurDzd', 4),
      summerHeat: buildContinuousSeries('summerHeat', 2),
      eidAdhaProximity: buildContinuousSeries('eidAdhaProximity', 4),
    },
    algerianPrices: algerianPricesList,
  };

  // Ensure output directory exists
  const outDir = path.resolve('public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'external_metrics.json');
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), 'utf-8');
  console.log(`Successfully generated and wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
