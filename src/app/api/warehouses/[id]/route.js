import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const { id } = await params;
    const warehouse = await Warehouse.findById(id).populate('manager', 'name email phone');
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    return NextResponse.json({ success: true, warehouse });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch warehouse');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    if (body.manager === '') body.manager = undefined;
    const warehouse = await Warehouse.findByIdAndUpdate(
      id, { $set: body }, { new: true, runValidators: true }
    ).populate('manager', 'name email phone');
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    return NextResponse.json({ success: true, warehouse });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to update warehouse');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;
    const warehouse = await Warehouse.findByIdAndDelete(id);
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to delete warehouse');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
