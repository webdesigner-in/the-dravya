import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import cache, { CACHE_TTL } from '@/lib/cache';

// GET dashboard data
export const maxDuration = 30; // Maximum execution time
export const dynamic = 'force-dynamic'; // Disable caching

export async function GET(request) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Check cache first (but allow cache busting with query param)
    const { searchParams } = new URL(request.url);
    const bustCache = searchParams.get('bustCache') === 'true';
    
    const cacheKey = `dashboard_${authUser.userId}_${authUser.role}`;
    
    if (!bustCache) {
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return NextResponse.json(cachedData, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }
    }

    // Get dates - Use UTC to avoid timezone issues
    const now = new Date();
    // Get start of today in UTC
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    // Filter orders by the logged-in user (createdBy) - Admin sees all orders
    const orderFilter = authUser.role === 'admin' ? {} : { createdBy: authUser.userId };

    // Fetch only necessary data with limits and specific fields
    const [
      todayOrders,
      pendingOrdersList,
      recentDeliveries,
      customers,
      lowStockProducts,
      overdueInvoices
    ] = await Promise.all([
      // Today's orders - limited to 50
      Order.find({
        ...orderFilter,
        createdAt: { $gte: startOfToday }
      })
        .select('orderNumber customer orderType guestInfo finalAmount status createdAt')
        .populate('customer', 'name')
        .limit(50)
        .lean()
        .maxTimeMS(5000),
      
      // Pending orders - limited to 20
      Order.find({
        ...orderFilter,
        status: { $in: ['pending', 'confirmed', 'processing'] }
      })
        .select('orderNumber customer orderType guestInfo finalAmount status createdAt')
        .populate('customer', 'name')
        .limit(20)
        .sort({ createdAt: -1 })
        .lean()
        .maxTimeMS(5000),
      
      // Recent deliveries - limited to 10
      Order.find({
        ...orderFilter,
        status: 'delivered'
      })
        .select('orderNumber customer orderType guestInfo finalAmount updatedAt')
        .populate('customer', 'name')
        .limit(10)
        .sort({ updatedAt: -1 })
        .lean()
        .maxTimeMS(5000),
      
      // Customer count only
      Customer.countDocuments({}).maxTimeMS(3000),
      
      // Low stock products - limited to 10
      Product.find({
        $expr: { $lte: ['$stock', '$minStockLevel'] },
        stock: { $gt: 0 }
      })
        .select('name size stock minStockLevel')
        .limit(10)
        .sort({ stock: 1 })
        .lean()
        .maxTimeMS(3000),
      
      // Overdue invoices - limited to 20
      Invoice.find({
        status: { $in: ['sent', 'partial'] },
        dueDate: { $lt: new Date() },
        balanceAmount: { $gt: 0 }
      })
        .select('order customer guestInfo balanceAmount dueDate')
        .populate({
          path: 'order',
          select: 'orderNumber customer orderType guestInfo createdBy',
          populate: { path: 'customer', select: 'name' }
        })
        .limit(20)
        .lean()
        .maxTimeMS(5000)
    ]);

    // Filter overdue invoices by user's orders (for non-admin)
    const filteredOverdueInvoices = authUser.role === 'admin' 
      ? overdueInvoices 
      : overdueInvoices.filter(inv => 
          inv.order?.createdBy?.toString() === authUser.userId
        );

    // Get month stats with aggregation (much faster)
    const monthStats = await Order.aggregate([
      {
        $match: {
          ...orderFilter,
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalAmount' },
          totalOrders: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$customer' }
        }
      }
    ]);

    const monthData = monthStats[0] || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: [] };

    // Calculate today's revenue
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);

    // Helper function to get customer name
    const getCustomerName = (order) => {
      if (order.customer?.name) {
        return order.customer.name;
      } else if (order.orderType === 'guest' && order.guestInfo?.name) {
        return `${order.guestInfo.name} (Guest)`;
      }
      return 'Unknown';
    };

    // Prepare overdue payments list
    const overduePaymentsList = filteredOverdueInvoices
      .filter(inv => inv.order)
      .map(invoice => {
        // Get customer name from invoice or order
        let customerName = 'Unknown';
        if (invoice.customer?.name) {
          customerName = invoice.customer.name;
        } else if (invoice.guestInfo?.name) {
          customerName = `${invoice.guestInfo.name} (Guest)`;
        } else if (invoice.order) {
          customerName = getCustomerName(invoice.order);
        }

        return {
          orderId: invoice.order._id,
          orderNumber: invoice.order.orderNumber,
          customerId: invoice.order.customer?._id,
          customerName,
          dueAmount: invoice.balanceAmount,
          dueDate: invoice.dueDate,
        };
      });

    const overdueAmount = filteredOverdueInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    // Get total stock count (aggregation is faster)
    const stockStats = await Product.aggregate([
      { $group: { _id: null, totalStock: { $sum: '$stock' } } }
    ]);
    const totalStock = stockStats[0]?.totalStock || 0;

    const dashboard = {
      summary: {
        totalRevenue: monthData.totalRevenue,
        totalOrders: monthData.totalOrders,
        pendingOrders: pendingOrdersList.length,
        totalCustomers: customers,
        activeCustomers: monthData.uniqueCustomers.length,
        totalStock,
        lowStockProducts: lowStockProducts.length,
      },
      today: {
        revenue: todayRevenue,
        orders: todayOrders.length,
      },
      todayOrders: todayOrders.slice(0, 10).map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          _id: order.customer?._id,
          name: getCustomerName(order),
        },
        finalAmount: order.finalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
      pendingOrdersList: pendingOrdersList.slice(0, 10).map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          _id: order.customer?._id,
          name: getCustomerName(order),
        },
        finalAmount: order.finalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
      lowStockProducts,
      overduePayments: {
        count: filteredOverdueInvoices.length,
        amount: overdueAmount,
        list: overduePaymentsList.slice(0, 10),
      },
      recentDeliveries: recentDeliveries.slice(0, 5).map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          _id: order.customer?._id,
          name: getCustomerName(order),
        },
        finalAmount: order.finalAmount,
        updatedAt: order.updatedAt,
      })),
    };

    const responseData = {
      success: true,
      dashboard,
    };

    // Cache the result for 5 minutes
    cache.set(cacheKey, responseData, CACHE_TTL.DASHBOARD);

    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch dashboard data');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
