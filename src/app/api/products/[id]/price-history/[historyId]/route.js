import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PriceHistory from '@/models/PriceHistory';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { historyId } = await params;

    const entry = await PriceHistory.findByIdAndDelete(historyId);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: e, statusCode, details } = handleApiError(error, 'Failed to delete price history');
    return NextResponse.json({ error: e, details }, { status: statusCode });
  }
}
