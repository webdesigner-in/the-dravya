import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

// GET debug user info - ADMIN ONLY
export async function GET(request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can access this debug endpoint
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access only' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get the full user document
    const userDoc = await User.findById(authUser.userId).select('-password');

    // Get all orders in the database
    const allOrders = await Order.find({}).select('orderNumber createdBy finalAmount');
    
    // Get orders created by this user
    const userOrders = await Order.find({ createdBy: authUser.userId }).select('orderNumber finalAmount');

    // Get all unique creators
    const allCreators = await Order.distinct('createdBy');
    const creatorDetails = await User.find({ _id: { $in: allCreators } }).select('name email role');

    return NextResponse.json({
      success: true,
      debug: {
        currentUser: {
          userId: authUser.userId,
          role: authUser.role,
          fullDetails: userDoc,
        },
        orderStats: {
          totalOrdersInDatabase: allOrders.length,
          ordersCreatedByCurrentUser: userOrders.length,
          currentUserRevenue: userOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0),
        },
        allCreators: creatorDetails,
        ordersByCreator: allCreators.map(creatorId => {
          const orders = allOrders.filter(o => o.createdBy?.toString() === creatorId.toString());
          const creator = creatorDetails.find(c => c._id.toString() === creatorId.toString());
          return {
            creatorId,
            creatorName: creator?.name || 'Unknown',
            creatorEmail: creator?.email || 'Unknown',
            creatorRole: creator?.role || 'Unknown',
            orderCount: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0),
          };
        }),
      },
    });
  } catch (error) {
    console.error('Debug user info error:', error);
    return NextResponse.json(
      { error: 'Something went wrong', details: error.message },
      { status: 500 }
    );
  }
}
