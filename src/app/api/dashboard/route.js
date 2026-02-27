import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';

// GET dashboard data
export async function GET(request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get dates - Use UTC to avoid timezone issues
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter orders by the logged-in user (createdBy) - Admin sees all orders
    const orderFilter = authUser.role === 'admin' ? {} : { createdBy: authUser.userId };

    // Debug logging
    console.log('=== DASHBOARD API DEBUG ===');
    console.log('Auth User:', {
      userId: authUser.userId,
      role: authUser.role,
      isAdmin: authUser.role === 'admin'
    });
    console.log('Order Filter:', JSON.stringify(orderFilter));
    console.log('========================');

    // Fetch data - orders filtered by user (or all for admin), customers shared
    const [allOrders, customers, products, invoices] = await Promise.all([
      Order.find(orderFilter)
        .populate('customer', 'name phone')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 }),
      Customer.find({}), // Customers are shared
      Product.find({}),
      Invoice.find({}).populate('order'),
    ]);

    console.log('Total orders found:', allOrders.length);
    console.log('Orders by creator:', allOrders.reduce((acc, order) => {
      const creatorId = order.createdBy?._id?.toString() || 'unknown';
      acc[creatorId] = (acc[creatorId] || 0) + 1;
      return acc;
    }, {}));

    // Filter invoices to only include those from user's orders (or all for admin)
    const userOrderIds = allOrders.map(order => order._id.toString());
    const userInvoices = invoices.filter(invoice => 
      invoice.order && userOrderIds.includes(invoice.order._id?.toString() || invoice.order.toString())
    );

    // Today's orders
    const todayOrders = allOrders.filter(
      (order) => new Date(order.createdAt) >= startOfToday
    );
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);

    // Debug logging
    console.log('=== TODAY\'S ORDERS DEBUG ===');
    console.log('Current time:', now);
    console.log('Start of today:', startOfToday);
    console.log('Total orders in DB:', allOrders.length);
    console.log('Today\'s orders count:', todayOrders.length);
    console.log('Today\'s orders:', todayOrders.map(o => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      isToday: new Date(o.createdAt) >= startOfToday
    })));
    console.log('All orders created today or later:', allOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= startOfToday;
    }).map(o => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      orderDate: new Date(o.createdAt),
      comparison: `${new Date(o.createdAt)} >= ${startOfToday}`
    })));
    console.log('========================');

    // This month's orders
    const monthOrders = allOrders.filter(
      (order) => new Date(order.createdAt) >= startOfMonth
    );

    // Pending orders (need action)
    const pendingOrdersList = allOrders.filter((order) =>
      ['pending', 'confirmed', 'processing'].includes(order.status)
    );

    // Low stock products
    const lowStockProducts = products
      .filter((product) => product.stock > 0 && product.stock <= (product.minStockLevel || 10))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((product) => ({
        _id: product._id,
        name: product.name,
        size: product.size,
        stock: product.stock,
        minStockLevel: product.minStockLevel || 10,
      }));

    // Overdue payments
    const overdueInvoices = userInvoices.filter((invoice) => {
      return (
        (invoice.status === 'sent' || invoice.status === 'partial') &&
        new Date(invoice.dueDate) < new Date() &&
        invoice.balanceAmount > 0
      );
    });

    const overduePaymentsList = [];
    for (const invoice of overdueInvoices.slice(0, 10)) {
      const order = allOrders.find((o) => o._id.toString() === invoice.order?.toString());
      if (order) {
        overduePaymentsList.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: order.customer?._id,
          customerName: order.customer?.name || 'Unknown',
          dueAmount: invoice.balanceAmount,
          dueDate: invoice.dueDate,
        });
      }
    }

    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    // Recent deliveries (last 5)
    const recentDeliveries = allOrders
      .filter((order) => order.status === 'delivered')
      .slice(0, 5)
      .map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          _id: order.customer?._id,
          name: order.customer?.name || 'Unknown',
        },
        finalAmount: order.finalAmount,
        updatedAt: order.updatedAt,
      }));

    // Summary
    const totalRevenue = monthOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    const totalOrders = monthOrders.length;
    const pendingOrders = pendingOrdersList.length;
    const totalCustomers = customers.length;
    const activeCustomers = new Set(monthOrders.map((order) => order.customer?._id?.toString())).size;
    const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);

    const dashboard = {
      summary: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        totalCustomers,
        activeCustomers,
        totalStock,
        lowStockProducts: lowStockProducts.length,
      },
      today: {
        revenue: todayRevenue,
        orders: todayOrders.length,
      },
      todayOrders: todayOrders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          _id: order.customer?._id,
          name: order.customer?.name || 'Unknown',
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
          name: order.customer?.name || 'Unknown',
        },
        finalAmount: order.finalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
      lowStockProducts,
      overduePayments: {
        count: overdueInvoices.length,
        amount: overdueAmount,
        list: overduePaymentsList,
      },
      recentDeliveries,
    };

    return NextResponse.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
