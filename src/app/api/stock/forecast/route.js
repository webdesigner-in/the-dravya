import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Look back 30 days for average consumption
    const LOOKBACK_DAYS = 30;
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    // Aggregate total quantity sold per product from delivered orders in last 30 days
    const consumption = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          updatedAt: { $gte: since },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQty: { $sum: '$items.quantity' },
        },
      },
    ]);

    // Map productId -> totalQty
    const consumptionMap = {};
    for (const row of consumption) {
      consumptionMap[row._id.toString()] = row.totalQty;
    }

    // Fetch all active products
    const products = await Product.find({ isActive: true })
      .select('name sku size stock minStockLevel bottlesPerCarton price')
      .lean();

    const forecast = products.map((p) => {
      const totalSold    = consumptionMap[p._id.toString()] || 0;
      const avgPerDay    = totalSold / LOOKBACK_DAYS;           // cartons/day
      const daysLeft     = avgPerDay > 0 ? Math.floor(p.stock / avgPerDay) : null;
      const reorderSoon  = daysLeft !== null && daysLeft <= 7;
      const outOfStock   = p.stock <= 0;
      const belowMin     = p.stock <= p.minStockLevel;

      return {
        _id:            p._id,
        name:           p.name,
        sku:            p.sku,
        size:           p.size,
        stock:          p.stock,
        minStockLevel:  p.minStockLevel,
        bottlesPerCarton: p.bottlesPerCarton,
        totalSoldLast30Days: totalSold,
        avgDailyUsage:  parseFloat(avgPerDay.toFixed(2)),
        daysRemaining:  daysLeft,
        reorderSoon,
        outOfStock,
        belowMin,
        status: outOfStock ? 'out'
          : reorderSoon   ? 'critical'
          : belowMin      ? 'low'
          : 'ok',
      };
    });

    // Sort: out of stock first, then critical, then low, then ok
    const order = { out: 0, critical: 1, low: 2, ok: 3 };
    forecast.sort((a, b) => order[a.status] - order[b.status]);

    return NextResponse.json({ success: true, forecast, lookbackDays: LOOKBACK_DAYS });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to generate stock forecast');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
