import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getServerSession } from "next-auth/next";

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10);

    const today = new Date();
    const pastDate = new Date();
    pastDate.setMonth(today.getMonth() - months);

    const period1 = pastDate.toISOString().split('T')[0];
    const period2 = today.toISOString().split('T')[0];
    
    // ZC=F (Corn Futures), LE=F (Live Cattle Futures)
    const cornData = await yahooFinance.historical('ZC=F', { period1, period2, interval: '1wk' });
    const beefData = await yahooFinance.historical('LE=F', { period1, period2, interval: '1wk' });

    const mergedMap = new Map();
    let mockChickenPrice = 350;

    cornData.forEach(item => {
      const dateStr = item.date.toISOString().split('T')[0];
      mockChickenPrice = mockChickenPrice + (Math.random() * 20 - 10);
      mergedMap.set(dateStr, {
        date: dateStr,
        cornPrice: item.close,
        chickenPrice: Math.round(mockChickenPrice),
        docPrice: Math.round(80 + (Math.random() * 20 - 10))
      });
    });

    beefData.forEach(item => {
      const dateStr = item.date.toISOString().split('T')[0];
      if (mergedMap.has(dateStr)) {
        mergedMap.get(dateStr).beefPrice = item.close;
      }
    });

    const finalData = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(finalData);
  } catch (error) {
    console.error("Market API Error:", error);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
