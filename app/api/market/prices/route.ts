import { NextResponse } from 'next/server';
import { db } from '@/db';
import { marketPrices } from '@/db/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const limitParam = searchParams.get('limit');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 2500) : 100;

    const conditions = [];

    if (region && region !== 'All') {
      conditions.push(eq(marketPrices.region, region));
    }
    if (startDate) {
      conditions.push(gte(marketPrices.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(marketPrices.date, endDate));
    }

    let query = db.select().from(marketPrices);

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(marketPrices.date), desc(marketPrices.id)).limit(limit);

    return NextResponse.json({
      success: true,
      count: rows.length,
      prices: rows,
    });
  } catch (error) {
    console.error('Error fetching market prices from DB:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve market prices' },
      { status: 500 }
    );
  }
}
