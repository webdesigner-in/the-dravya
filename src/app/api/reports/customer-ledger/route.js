import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';

// GET customer ledger report
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const isAdmin = authUser.role === 'admin';

    // Get all customers (shared)
    const customers = await Customer.find({}).sort({ name: 1 });

    // Build ledger for each customer based on user's orders (or all for admin)
    const ledger = [];
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;

    for (const customer of customers) {
      // Get orders for this customer - admin sees all, others see only their own
      const orderFilter = { customer: customer._id };
      if (!isAdmin) {
        orderFilter.createdBy = authUser.userId;
      }
      
      const orders = await Order.find(orderFilter);

      if (orders.length === 0) continue; // Skip customers with no orders

      // Calculate totals
      const customerTotal = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
      const customerPaid = orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
      const customerDue = customerTotal - customerPaid;

      ledger.push({
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        totalOrders: orders.length,
        totalAmount: customerTotal,
        paidAmount: customerPaid,
        dueAmount: customerDue,
      });

      totalRevenue += customerTotal;
      totalPaid += customerPaid;
      totalDue += customerDue;
    }

    // Sort by due amount (highest first)
    ledger.sort((a, b) => b.dueAmount - a.dueAmount);

    // Only send summary to admins
    const summary = isAdmin ? {
      totalRevenue,
      totalPaid,
      totalDue,
      totalCustomers: ledger.length,
    } : null;

    // Calculate pagination
    const totalItems = ledger.length;
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;
    const paginatedLedger = ledger.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      ledger: paginatedLedger,
      summary,
      isAdmin,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
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
