import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

// GET all invoices
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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer');
    const orderId = searchParams.get('order');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Admin sees all invoices, others see only their own
    let filter = {};
    
    if (authUser.role !== 'admin') {
      // First, get all orders created by the logged-in user
      const userOrders = await Order.find({ createdBy: authUser.userId }).select('_id');
      const userOrderIds = userOrders.map(order => order._id);
      
      // Filter invoices to only include those from user's orders
      filter.order = { $in: userOrderIds };
    }

    if (customerId) {
      filter.customer = customerId;
    }

    if (orderId) {
      filter.order = orderId;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const invoices = await Invoice.find(filter)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber orderType guestInfo')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Search filter
    let filteredInvoices = invoices;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInvoices = invoices.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.customer?.name.toLowerCase().includes(searchLower) ||
          invoice.customer?.phone.includes(search) ||
          invoice.order?.orderNumber.toLowerCase().includes(searchLower) ||
          invoice.guestInfo?.name?.toLowerCase().includes(searchLower) ||
          invoice.guestInfo?.phone?.includes(search)
      );
    }

    // Calculate pagination
    const totalInvoices = filteredInvoices.length;
    const totalPages = Math.ceil(totalInvoices / limit);
    const skip = (page - 1) * limit;
    const paginatedInvoices = filteredInvoices.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalInvoices,
        itemsPerPage: limit,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
