import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';

// GET all users with their order counts - ADMIN ONLY
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

    // Get all users
    const allUsers = await User.find({}).select('-password');

    // Get all orders
    const allOrders = await Order.find({}).select('orderNumber createdBy finalAmount');

    // Calculate stats for each user
    const userStats = await Promise.all(
      allUsers.map(async (user) => {
        const userOrders = allOrders.filter(
          (order) => order.createdBy?.toString() === user._id.toString()
        );
        const totalRevenue = userOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          orderCount: userOrders.length,
          totalRevenue: totalRevenue,
          createdAt: user.createdAt,
        };
      })
    );

    // Sort by order count descending
    userStats.sort((a, b) => b.orderCount - a.orderCount);

    return NextResponse.json({
      success: true,
      currentUser: {
        userId: authUser.userId,
        role: authUser.role,
      },
      totalUsers: allUsers.length,
      totalOrders: allOrders.length,
      users: userStats,
    });
  } catch (error) {
    console.error('Debug all users error:', error);
    return NextResponse.json(
      { error: 'Something went wrong', details: error.message },
      { status: 500 }
    );
  }
}
