import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// Configure route for production
export const maxDuration = 30; // Maximum execution time in seconds
export const dynamic = 'force-dynamic'; // Disable caching

// GET customer ledger report
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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const month = searchParams.get('month'); // Format: "YYYY-MM" or "all"
    const isAdmin = authUser.role === 'admin';

    // Use aggregation pipeline to fetch all data in ONE query (fixes N+1 problem)
    const mongoose = await import('mongoose');
    
    const matchStage = isAdmin 
      ? {} 
      : { createdBy: new mongoose.default.Types.ObjectId(authUser.userId) };

    // Add date filter if month is specified
    if (month && month !== 'all') {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      matchStage.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const ledgerData = await Order.aggregate([
      {
        $match: {
          ...matchStage,
          customer: { $exists: true, $ne: null } // Only include orders with customers
        }
      },
      {
        $group: {
          _id: '$customer',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          deliveredUnpaidOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $in: ['$paymentStatus', ['unpaid', 'partial']] }
                  ]
                },
                1,
                0
              ]
            }
          },
          deliveredTotal: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $in: ['$paymentStatus', ['unpaid', 'partial']] }
                  ]
                },
                '$finalAmount',
                0
              ]
            }
          },
          deliveredPaid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $in: ['$paymentStatus', ['unpaid', 'partial']] }
                  ]
                },
                '$paidAmount',
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      {
        $unwind: '$customerData'
      },
      {
        $project: {
          customer: {
            _id: '$customerData._id',
            name: '$customerData.name',
            phone: '$customerData.phone',
            email: '$customerData.email'
          },
          totalOrders: 1,
          deliveredUnpaidOrders: 1,
          totalAmount: 1,
          paidAmount: 1,
          dueAmount: { $subtract: ['$deliveredTotal', '$deliveredPaid'] }
        }
      },
      {
        $sort: { dueAmount: -1 }
      }
    ], { maxTimeMS: 25000 }); // Add 25 second timeout as option

    const ledger = ledgerData;
    
    // Calculate totals
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    ledger.forEach(item => {
      totalRevenue += item.totalAmount || 0;
      totalPaid += item.paidAmount || 0;
      totalDue += item.dueAmount || 0;
    });

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
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch customer ledger');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}
