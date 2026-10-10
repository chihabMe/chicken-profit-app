#!/usr/bin/env npx tsx
/**
 * Automated Verification Script: Multi-Horizon Statistical Correlation Engine
 * 
 * Verifies multi-metric external price drivers (2022-2026) against authentic
 * Algerian wholesale poultry prices (Chelghoum Laïd, El Eulma, Mila, Bordj Bou Arréridj).
 * 
 * Usage: npx tsx scripts/verify_correlations.ts
 */

import fs from 'fs';
import path from 'path';

interface MetricDataPoint {
  date: string;
  isoWeek: string;
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

interface MetricMeta {
  key: keyof ExternalMetricsBundle['metrics'];
  name: string;
  symbol: string;
  unit: string;
  category: string;
}

const METRICS_META: MetricMeta[] = [
  { key: 'soybeanMeal', name: 'Soybean Meal Futures', symbol: 'CBOT ZM=F', unit: 'USD/short ton', category: 'Feed Commodities' },
  { key: 'soybeans', name: 'Soybeans Futures', symbol: 'CBOT ZS=F', unit: 'US cents/bushel', category: 'Feed Commodities' },
  { key: 'corn', name: 'Corn (Maize) Futures', symbol: 'CBOT ZC=F', unit: 'US cents/bushel', category: 'Feed Commodities' },
  { key: 'wheat', name: 'Wheat Futures', symbol: 'CBOT ZW=F', unit: 'US cents/bushel', category: 'Feed Commodities' },
  { key: 'brentCrude', name: 'Brent Crude Oil', symbol: 'ICE BZ=F', unit: 'USD/barrel', category: 'Energy & Logistics' },
  { key: 'freightBdry', name: 'Breakwave Dry Bulk ETF', symbol: 'BDRY', unit: 'USD/share', category: 'Energy & Logistics' },
  { key: 'usdDzd', name: 'USD/DZD Official FX', symbol: 'DZD=X', unit: 'DZD/USD', category: 'Currency & Macro' },
  { key: 'eurDzd', name: 'EUR/DZD Official FX', symbol: 'EURDZD=X', unit: 'DZD/EUR', category: 'Currency & Macro' },
  { key: 'summerHeat', name: 'Summer Heat Max Temp', symbol: 'Open-Meteo', unit: '°C (Chelghoum Laid)', category: 'Seasonality & Weather' },
  { key: 'eidAdhaProximity', name: 'Eid al-Adha Proximity', symbol: 'Hijri Calendar', unit: 'Index (0 to 1)', category: 'Calendar & Seasonality' },
];

const LAGS = [0, 4, 8, 12, 16, 20, 24];

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[], m = mean(arr)): number {
  if (arr.length === 0) return 0;
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

export function pearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const mx = mean(x);
  const my = mean(y);
  const sx = stdDev(x, mx);
  const sy = stdDev(y, my);
  if (sx === 0 || sy === 0) return 0;
  let num = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
  }
  return num / (x.length * sx * sy);
}

export function rank(arr: number[]): number[] {
  const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].val === sorted[i].val) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].idx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

export function spearman(x: number[], y: number[]): number {
  return pearson(rank(x), rank(y));
}

export function rSquared(r: number): number {
  return r * r;
}

export interface LagResult {
  lagWeeks: number;
  sampleSize: number;
  pearsonR: number;
  spearmanRho: number;
  r2: number;
}

export interface MetricEvaluation {
  meta: MetricMeta;
  lags: LagResult[];
  optimalLag: LagResult;
  passesThreshold: boolean;
}

export function evaluateMetrics(bundle: ExternalMetricsBundle): MetricEvaluation[] {
  const chickenPrices = bundle.algerianPrices.map(p => p.avgPriceDzd);
  const totalWeeks = chickenPrices.length;

  const evaluations: MetricEvaluation[] = [];

  for (const meta of METRICS_META) {
    const seriesPoints = bundle.metrics[meta.key];
    const metricByWeek = new Map<string, number>();
    for (const pt of seriesPoints) {
      metricByWeek.set(pt.isoWeek, pt.value);
    }

    const alignedMetric: number[] = [];
    for (const p of bundle.algerianPrices) {
      alignedMetric.push(metricByWeek.get(p.isoWeek) ?? 0);
    }

    const lagResults: LagResult[] = [];
    let optimal: LagResult | null = null;
    let maxAbsR = -1;

    for (const lag of LAGS) {
      if (lag >= totalWeeks) continue;
      const x = alignedMetric.slice(0, alignedMetric.length - lag);
      const y = chickenPrices.slice(lag);
      const r = pearson(x, y);
      const rho = spearman(x, y);
      const r2 = rSquared(r);

      const lagRes: LagResult = {
        lagWeeks: lag,
        sampleSize: x.length,
        pearsonR: Math.round(r * 10000) / 10000,
        spearmanRho: Math.round(rho * 10000) / 10000,
        r2: Math.round(r2 * 10000) / 10000,
      };
      lagResults.push(lagRes);

      if (Math.abs(r) > maxAbsR) {
        maxAbsR = Math.abs(r);
        optimal = lagRes;
      }
    }

    const optimalLag = optimal ?? lagResults[0];
    const passes = Math.abs(optimalLag.pearsonR) >= 0.35 || optimalLag.r2 >= 0.12;

    evaluations.push({
      meta,
      lags: lagResults,
      optimalLag,
      passesThreshold: passes,
    });
  }

  // Sort descending by optimal R^2
  evaluations.sort((a, b) => b.optimalLag.r2 - a.optimalLag.r2);
  return evaluations;
}

function printReport(evaluations: MetricEvaluation[], generatedAt: string, period: string) {
  console.log('='.repeat(92));
  console.log('  ALGERIAN POULTRY PRICE DRIVERS: MULTI-HORIZON CORRELATION VERIFICATION');
  console.log('='.repeat(92));
  console.log(`Dataset Period:   ${period}`);
  console.log(`Bundle Timestamp: ${generatedAt}`);
  console.log(`Evaluation Date:  ${new Date().toISOString()}`);
  console.log('-'.repeat(92));

  console.log('\n### 1. SUMMARY RANKINGS TABLE (OPTIMAL HORIZONS)');
  console.log('-'.repeat(92));
  console.log(
    'Rank'.padEnd(5) +
    'Candidate Metric'.padEnd(28) +
    'Category'.padEnd(22) +
    'Optimal Lag'.padEnd(13) +
    'Pearson r'.padEnd(11) +
    'Spearman ρ'.padEnd(12) +
    'R² (%)'.padEnd(9) +
    'Threshold'
  );
  console.log('-'.repeat(92));

  evaluations.forEach((item, idx) => {
    const rankStr = `#${idx + 1}`.padEnd(5);
    const nameStr = `${item.meta.name}`.slice(0, 26).padEnd(28);
    const catStr = item.meta.category.slice(0, 20).padEnd(22);
    const lagStr = `${item.optimalLag.lagWeeks} wks (~${(item.optimalLag.lagWeeks / 4.3).toFixed(1)}m)`.padEnd(13);
    const rStr = (item.optimalLag.pearsonR >= 0 ? '+' : '') + item.optimalLag.pearsonR.toFixed(4).padEnd(10);
    const rhoStr = (item.optimalLag.spearmanRho >= 0 ? '+' : '') + item.optimalLag.spearmanRho.toFixed(4).padEnd(11);
    const r2Str = `${(item.optimalLag.r2 * 100).toFixed(2)}%`.padEnd(9);
    const threshStr = item.passesThreshold ? 'PASS (|r|>=0.35)' : 'Below limit';

    console.log(rankStr + nameStr + catStr + lagStr + rStr + rhoStr + r2Str + threshStr);
  });
  console.log('-'.repeat(92));

  console.log('\n### 2. DETAILED MULTI-HORIZON CORRELATION MATRIX (Lags 0 to 24 Weeks)');
  console.log('-'.repeat(92));
  console.log(
    'Metric / Symbol'.padEnd(28) +
    'Lag 0w'.padEnd(9) +
    'Lag 4w'.padEnd(9) +
    'Lag 8w'.padEnd(9) +
    'Lag 12w'.padEnd(9) +
    'Lag 16w'.padEnd(9) +
    'Lag 20w'.padEnd(9) +
    'Lag 24w'.padEnd(9)
  );
  console.log('-'.repeat(92));

  for (const item of evaluations) {
    const header = `${item.meta.name} (${item.meta.symbol})`.slice(0, 26).padEnd(28);
    const rLine = item.lags
      .map(l => ((l.pearsonR >= 0 ? '+' : '') + l.pearsonR.toFixed(3)).padEnd(9))
      .join('');
    console.log(header + rLine);
  }
  console.log('-'.repeat(92));

  // Acceptance Criteria Validation
  const soyMeal = evaluations.find(e => e.meta.key === 'soybeanMeal');
  const lag16 = soyMeal?.lags.find(l => l.lagWeeks === 16);

  console.log('\n### 3. ACCEPTANCE CRITERIA EMPIRICAL VALIDATION');
  console.log('-'.repeat(92));
  if (!soyMeal || !lag16) {
    console.error('FAIL: Soybean Meal (ZM=F) 16-week lag not found in evaluations.');
    process.exit(1);
  }

  console.log(`Validated Metric:     Soybean Meal Futures (${soyMeal.meta.symbol})`);
  console.log(`Lead-Lag Horizon:     16 weeks (~3.7 to 4 months)`);
  console.log(`Sample Weeks (N):     ${lag16.sampleSize} mutual trading weeks`);
  console.log(`Empirical Pearson r:  ${lag16.pearsonR.toFixed(4)} (Expected: ~ +0.49)`);
  console.log(`Empirical Spearman ρ: ${lag16.spearmanRho.toFixed(4)} (Expected: ~ +0.47 - +0.50)`);
  console.log(`Empirical R²:         ${(lag16.r2 * 100).toFixed(2)}% (Expected: ~ 24%)`);
  console.log(`Threshold Required:   |r| >= 0.35 OR R² >= 12%`);

  const passed = Math.abs(lag16.pearsonR) >= 0.35 && lag16.r2 >= 0.12;
  if (passed) {
    console.log(`Status:               SUCCESS - ACCEPTANCE CRITERIA SATISFIED`);
    console.log('='.repeat(92));
    process.exit(0);
  } else {
    console.error(`Status:               FAIL - Criteria not satisfied`);
    console.log('='.repeat(92));
    process.exit(1);
  }
}

function main() {
  const bundlePath = path.resolve('public/data/external_metrics.json');
  if (!fs.existsSync(bundlePath)) {
    console.error(`ERROR: Dataset bundle not found at ${bundlePath}`);
    console.error('Run `npx tsx scripts/fetch_external_metrics.ts` to generate it.');
    process.exit(1);
  }

  const raw = fs.readFileSync(bundlePath, 'utf-8');
  const bundle: ExternalMetricsBundle = JSON.parse(raw);
  const evaluations = evaluateMetrics(bundle);
  printReport(evaluations, bundle.generatedAt, bundle.metadata.period);
}

import { fileURLToPath } from 'url';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
