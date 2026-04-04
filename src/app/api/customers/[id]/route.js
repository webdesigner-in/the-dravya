import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Invoice from '@/models/Invoice';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const customer = await Customer.findById(id).populate('assignedDistributor', 'name email');
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch customer');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Only admins can update customers.' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (body.phone && body.phone !== existingCustomer.phone) {
      const phoneExists = await Customer.findOne({ phone: body.phone, _id: { $ne: id } });
      if (phoneExists) {
        return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 });
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('assignedDistributor', 'name email');

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update customer');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Only admins can delete customers.' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Prevent deletion if customer has associated orders or invoices
    const [orderCount, invoiceCount] = await Promise.all([
      Order.countDocuments({ customer: id }),
      Invoice.countDocuments({ customer: id }),
    ]);

    if (orderCount > 0 || invoiceCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with existing orders or invoices',
          details: {
            orders: orderCount,
            invoices: invoiceCount,
          },
        },
        { status: 400 }
      );
    }

    await customer.deleteOne();

    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete customer');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
