import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import PriceHistory from '@/models/PriceHistory';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const monthsParam = parseInt(searchParams.get('months') || '6');

    // Build monthly buckets
    const now = new Date();
    const buckets = [];

    if (monthsParam === 0) {
      // Today — single bucket showing today's total
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      buckets.push({ label: 'Today', start, end });
    } else if (monthsParam === 1) {
      // This month — daily buckets
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const s = new Date(d.getFullYear(), d.getMonth(), day, 0, 0, 0, 0);
        const e = new Date(d.getFullYear(), d.getMonth(), day, 23, 59, 59, 999);
        buckets.push({
          label: `${day}`,
          start: s,
          end:   e,
        });
      }
    } else {
      const months = Math.min(12, monthsParam);
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
        });
      }
    }

    // Fetch all products for cost lookup
    const products = await Product.find({}).select('_id name size costPrice price').lean();
    const productMap = {};
    for (const p of products) productMap[p._id.toString()] = p;

    // Fetch all price history sorted ascending so we can find cost at any point in time
    const allPriceHistory = await PriceHistory.find({}).sort({ effectiveFrom: 1 }).lean();

    // For a given product and date, find the cost price effective at that time
    // Uses UTC year/month to avoid timezone offset issues
    const getMonthKey = (date) => {
      const d = new Date(date);
      return d.getUTCFullYear() * 100 + d.getUTCMonth(); // e.g. 202602 for Feb 2026
    };

    const getCostAtDate = (productId, date) => {
      const pid = productId.toString();
      const targetKey = getMonthKey(date);
      const entries = allPriceHistory
        .filter(h => h.product.toString() === pid && getMonthKey(h.effectiveFrom) <= targetKey);
      if (entries.length > 0) return entries[entries.length - 1].costPrice;
      return productMap[pid]?.costPrice || 0;
    };

    const getCatalogPriceAtDate = (productId, date) => {
      const pid = productId.toString();
      const targetKey = getMonthKey(date);
      const entries = allPriceHistory
        .filter(h => h.product.toString() === pid && getMonthKey(h.effectiveFrom) <= targetKey);
      if (entries.length > 0) return entries[entries.length - 1].sellingPrice;
      return productMap[pid]?.price || 0;
    };

    // Fetch delivered orders grouped by month
    const monthlyData = await Promise.all(buckets.map(async (bucket) => {
      const orders = await Order.find({
        status: 'delivered',
        $or: [
          { deliveryDate: { $gte: bucket.start, $lte: bucket.end } },
          { deliveryDate: null, createdAt: { $gte: bucket.start, $lte: bucket.end } },
        ],
      }).select('items finalAmount paidAmount deliveryDate createdAt').lean();

      let revenue = 0;
      let cost    = 0;
      let cartons = 0;

      for (const order of orders) {
        const orderDate = order.deliveryDate || order.createdAt;
        revenue += order.finalAmount || 0;

        for (const item of (order.items || [])) {
          const qty        = item.quantity || 0;
          const costPrice  = getCostAtDate(item.product, orderDate);
          cost    += costPrice * qty;
          cartons += qty;
        }
      }

      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        label:   bucket.label,
        revenue: parseFloat(revenue.toFixed(2)),
        cost:    parseFloat(cost.toFixed(2)),
        profit:  parseFloat(profit.toFixed(2)),
        margin:  parseFloat(margin.toFixed(1)),
        orders:  orders.length,
        cartons,
      };
    }));

    // Per-product price trend (selling price from orders, cost from PriceHistory)
    const productTrends = await Promise.all(products.map(async (product) => {
      const pid = product._id.toString();

      const trend = await Promise.all(buckets.map(async (bucket) => {
        // Average selling price from orders in this month
        const orders = await Order.find({
          status: 'delivered',
          'items.product': product._id,
          $or: [
            { deliveryDate: { $gte: bucket.start, $lte: bucket.end } },
            { deliveryDate: null, createdAt: { $gte: bucket.start, $lte: bucket.end } },
          ],
        }).select('items deliveryDate createdAt').lean();

        let totalRevenue = 0;
        let totalQty     = 0;

        for (const order of orders) {
          const item = order.items.find(i => i.product.toString() === pid);
          if (item) {
            totalRevenue += item.price * item.quantity;
            totalQty     += item.quantity;
          }
        }

        const avgSell = totalQty > 0 ? totalRevenue / totalQty : null;
        const cost    = getCostAtDate(pid, bucket.end);
        const catalog = getCatalogPriceAtDate(pid, bucket.end);

        return {
          label:        bucket.label,
          avgSellPrice: avgSell !== null ? parseFloat(avgSell.toFixed(2)) : null,
          catalogPrice: parseFloat(catalog.toFixed(2)),
          costPrice:    parseFloat(cost.toFixed(2)),
          margin:       avgSell !== null && cost > 0
            ? parseFloat(((avgSell - cost) / avgSell * 100).toFixed(1))
            : null,
          cartonsSold: totalQty,
        };
      }));

      return {
        productId:   pid,
        name:        product.name,
        size:        product.size,
        currentCost: product.costPrice,
        currentSell: product.price,
        trend,
      };
    }));

    return NextResponse.json({
      success: true,
      months: monthsParam,
      monthly:  monthlyData,
      products: productTrends,
    });
  } catch (error) {
    const { error: e, statusCode, details } = handleApiError(error, 'Failed to fetch profit analysis');
    return NextResponse.json({ error: e, details }, { status: statusCode });
  }
}
