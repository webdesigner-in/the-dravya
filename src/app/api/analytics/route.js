import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { createLogger } from '@/lib/logger';
import { QUERY_TIMEOUTS } from '@/lib/constants';

const logger = createLogger('AnalyticsAPI');

// GET analytics data
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

    // Only admins can view analytics
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Only administrators can view analytics.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || 'all';

    // Calculate date filter based on month
    let orderDateFilter = {};
    let invoiceOrderDateFilter = {};

    if (month && month !== 'all') {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      // Filter orders by their creation date
      orderDateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      // For invoices, we need to filter by the order's creation date, not invoice creation date
      // We'll handle this after fetching
    }

    // Fetch all necessary data with timeouts and lean queries
    // Use individual try-catch blocks for better error handling
    let orders = [];
    let customers = [];
    let products = [];
    let allInvoices = [];
    let invoices = []; // Filtered invoices based on order date

    try {
      const results = await Promise.allSettled([
        Order.find(orderDateFilter)
          .populate('customer', 'name')
          .populate('items.product', 'name size')
          .lean()
          .maxTimeMS(QUERY_TIMEOUTS.MODERATE),
        Customer.find({})
          .select('_id name')
          .lean()
          .maxTimeMS(QUERY_TIMEOUTS.FAST),
        Product.find({})
          .select('_id name size stock reorderLevel')
          .lean()
          .maxTimeMS(QUERY_TIMEOUTS.FAST),
        // Fetch all invoices with their order reference
        Invoice.find({})
          .select('status dueDate paidAmount totalAmount order')
          .lean()
          .maxTimeMS(QUERY_TIMEOUTS.FAST),
      ]);

      // Extract results with fallbacks
      orders = results[0].status === 'fulfilled' ? results[0].value : [];
      customers = results[1].status === 'fulfilled' ? results[1].value : [];
      products = results[2].status === 'fulfilled' ? results[2].value : [];
      allInvoices = results[3].status === 'fulfilled' ? results[3].value : [];
      
      // Filter invoices to only include those whose orders are in the date range
      const orderIds = new Set(orders.map(o => o._id.toString()));
      invoices = allInvoices.filter(invoice => 
        invoice.order && orderIds.has(invoice.order.toString())
      );

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const collections = ['orders', 'customers', 'products', 'invoices'];
          logger.error(`Failed to fetch ${collections[index]}`, result.reason);
        }
      });
    } catch (error) {
      logger.error('Analytics data fetch error', error);
    }

    // Revenue Metrics - Calculate from Invoices only (proper accounting)
    // Only count orders that have been invoiced
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0);
    const totalOutstanding = totalRevenue - totalCollected;
    const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Order Metrics
    const ordersByStatus = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      'out-for-delivery': 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      if (ordersByStatus.hasOwnProperty(order.status)) {
        ordersByStatus[order.status]++;
      }
    });

    const deliveredOrders = ordersByStatus.delivered;
    const cancelledOrders = ordersByStatus.cancelled;
    const pendingOrders = ordersByStatus.pending + ordersByStatus.confirmed + ordersByStatus.processing + ordersByStatus['out-for-delivery'];
    const deliveryRate = orders.length > 0 ? (deliveredOrders / orders.length) * 100 : 0;
    const cancellationRate = orders.length > 0 ? (cancelledOrders / orders.length) * 100 : 0;

    // Payment Metrics
    const paidOrders = orders.filter((order) => order.paymentStatus === 'paid').length;
    const partialOrders = orders.filter((order) => order.paymentStatus === 'partial').length;
    const unpaidOrders = orders.filter((order) => order.paymentStatus === 'unpaid').length;

    // Customer Metrics
    const customersWithOrders = new Set(orders.map((order) => order.customer?._id?.toString())).size;
    const averageOrdersPerCustomer = customersWithOrders > 0 ? orders.length / customersWithOrders : 0;
    const averageLifetimeValue = customersWithOrders > 0 ? totalRevenue / customersWithOrders : 0;

    // Inventory Metrics
    const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
    const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= (product.reorderLevel || 10)).length;
    const outOfStockProducts = products.filter((product) => product.stock === 0).length;

    // Invoice Metrics
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid').length;
    const pendingInvoices = invoices.filter((invoice) => invoice.status === 'sent' || invoice.status === 'partial').length;
    const overdueInvoices = invoices.filter((invoice) => {
      return (
        (invoice.status === 'sent' || invoice.status === 'partial') &&
        new Date(invoice.dueDate) < new Date()
      );
    }).length;

    // Top Customers (by total spent)
    const customerSpending = {};
    orders.forEach((order) => {
      const customerId = order.customer?._id?.toString();
      if (customerId) {
        if (!customerSpending[customerId]) {
          customerSpending[customerId] = {
            _id: customerId,
            name: order.customer?.name || 'Unknown',
            totalSpent: 0,
            orderCount: 0,
          };
        }
        customerSpending[customerId].totalSpent += order.finalAmount || 0;
        customerSpending[customerId].orderCount++;
      }
    });

    const topCustomers = Object.values(customerSpending)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Top Products (by quantity sold)
    const productSales = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.product?._id?.toString();
        if (productId) {
          if (!productSales[productId]) {
            productSales[productId] = {
              _id: productId,
              name: item.product?.name || 'Unknown',
              size: item.product?.size || { value: 0, unit: 'L' },
              totalSold: 0,
              revenue: 0,
            };
          }
          productSales[productId].totalSold += item.quantity || 0;
          productSales[productId].revenue += item.subtotal || 0;
        }
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Compile analytics
    const analytics = {
      revenue: {
        total: totalRevenue,
        collected: totalCollected,
        outstanding: totalOutstanding,
        collectionRate,
        averageOrderValue,
        orderCount: orders.length,
      },
      orders: {
        total: orders.length,
        delivered: deliveredOrders,
        pending: pendingOrders,
        cancelled: cancelledOrders,
        deliveryRate,
        cancellationRate,
        byStatus: ordersByStatus,
      },
      payments: {
        paid: paidOrders,
        partial: partialOrders,
        unpaid: unpaidOrders,
      },
      customers: {
        total: customers.length,
        withOrders: customersWithOrders,
        averageOrdersPerCustomer,
        averageLifetimeValue,
      },
      inventory: {
        totalProducts: products.length,
        totalStock,
        lowStockProducts,
        outOfStockProducts,
      },
      invoices: {
        total: invoices.length,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
      },
      topCustomers,
      topProducts,
    };

    return NextResponse.json({
      success: true,
      analytics,
      month,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch analytics data');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
