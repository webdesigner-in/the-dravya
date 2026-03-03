import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';

// GET analytics data
export async function GET(request) {
  try {
    const authUser = await getAuthUser();

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
    const range = searchParams.get('range') || 'month';

    // Calculate date filter
    let dateFilter = {};
    const now = new Date();

    switch (range) {
      case 'today':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
          },
        };
        break;
      case 'week':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setDate(now.getDate() - 7)),
          },
        };
        break;
      case 'month':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setMonth(now.getMonth() - 1)),
          },
        };
        break;
      case 'year':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.setFullYear(now.getFullYear() - 1)),
          },
        };
        break;
      case 'all':
      default:
        dateFilter = {};
        break;
    }

    // Fetch all necessary data
    const [orders, customers, products, invoices] = await Promise.all([
      Order.find(dateFilter).populate('customer', 'name').populate('items.product', 'name size'),
      Customer.find({}),
      Product.find({}),
      Invoice.find(dateFilter),
    ]);

    // Revenue Metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    const totalCollected = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
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
      range,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
