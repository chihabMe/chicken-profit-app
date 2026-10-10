import { NextResponse } from 'next/server';
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
    usdDzd?: MetricDataPoint[];
    [key: string]: any;
  };
  algerianPrices: {
    isoWeek: string;
    avgPriceDzd: number;
    sampleCount: number;
  }[];
}

export interface MarketApiResponse {
  historicalCorrelation: {
    metricName: string;
    leadLagWeeks: number;
    pearsonR: number;
    rSquared: number;
    sampleWeeks: number;
  };
  timeSeries: {
    date: string;
    isoWeek: string;
    chickenPriceDzd: number;
    driverPriceUsd: number;
    driverPriceDzdEquivalent?: number;
  }[];
}

let cachedBundle: ExternalMetricsBundle | null = null;

async function getBundle(): Promise<ExternalMetricsBundle | null> {
  if (cachedBundle) return cachedBundle;
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'external_metrics.json');
    const content = await fs.promises.readFile(filePath, 'utf-8');
    cachedBundle = JSON.parse(content) as ExternalMetricsBundle;
    return cachedBundle;
  } catch (err) {
    console.error('Failed to load external_metrics.json:', err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const bundle = await getBundle();

    if (!bundle || !bundle.metrics || !bundle.algerianPrices) {
      const fallbackResponse: MarketApiResponse = {
        historicalCorrelation: {
          metricName: 'Soybean Meal Futures (CBOT ZM=F)',
          leadLagWeeks: 16,
          pearsonR: 0,
          rSquared: 0,
          sampleWeeks: 0,
        },
        timeSeries: [],
      };
      return NextResponse.json(fallbackResponse);
    }

    const mealMap = new Map<string, MetricDataPoint>();
    if (Array.isArray(bundle.metrics.soybeanMeal)) {
      bundle.metrics.soybeanMeal.forEach(pt => mealMap.set(pt.isoWeek, pt));
    }

    const usdMap = new Map<string, MetricDataPoint>();
    if (Array.isArray(bundle.metrics.usdDzd)) {
      bundle.metrics.usdDzd.forEach(pt => usdMap.set(pt.isoWeek, pt));
    }

    const leadLagWeeks = 16;
    const totalPrices = bundle.algerianPrices.length;
    const fullTimeSeries: MarketApiResponse['timeSeries'] = [];

    for (let i = leadLagWeeks; i < totalPrices; i++) {
      const currentChicken = bundle.algerianPrices[i];
      const laggedChickenWeek = bundle.algerianPrices[i - leadLagWeeks].isoWeek;
      const laggedDriverPt = mealMap.get(laggedChickenWeek);
      const currentMealPt = mealMap.get(currentChicken.isoWeek);
      const currentUsdPt = usdMap.get(currentChicken.isoWeek);

      const date = currentMealPt?.date || '2026-01-01';
      const chickenPriceDzd = Math.round(currentChicken.avgPriceDzd * 100) / 100;
      const driverPriceUsd = laggedDriverPt ? Math.round(laggedDriverPt.value * 100) / 100 : 0;
      const usdRate = currentUsdPt ? currentUsdPt.value : 135;
      const driverPriceDzdEquivalent = Math.round(driverPriceUsd * usdRate);

      fullTimeSeries.push({
        date,
        isoWeek: currentChicken.isoWeek,
        chickenPriceDzd,
        driverPriceUsd,
        driverPriceDzdEquivalent,
      });
    }

    const historicalCorrelation = {
      metricName: 'Soybean Meal Futures (CBOT ZM=F)',
      leadLagWeeks: 16,
      pearsonR: 0.4915,
      rSquared: 0.2416,
      sampleWeeks: fullTimeSeries.length,
    };

    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');

    let timeSeries = fullTimeSeries;
    if (monthsParam !== null && monthsParam.toLowerCase() !== 'all') {
      let months = parseInt(monthsParam, 10);
      if (isNaN(months) || months <= 0) {
        months = 6;
      } else {
        months = Math.min(months, 60);
      }

      if (fullTimeSeries.length > 0) {
        const lastDate = new Date(fullTimeSeries[fullTimeSeries.length - 1].date);
        const cutoff = new Date(lastDate);
        cutoff.setMonth(cutoff.getMonth() - months);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const filtered = fullTimeSeries.filter(pt => pt.date >= cutoffStr);
        if (filtered.length > 0) {
          timeSeries = filtered;
        }
      }
    }

    const response: MarketApiResponse = {
      historicalCorrelation,
      timeSeries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Market API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
