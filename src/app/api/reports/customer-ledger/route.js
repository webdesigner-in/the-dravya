import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Customer from '@/models/Customer';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { QUERY_LIMITS, QUERY_TIMEOUTS } from '@/lib/constants';

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
    const limit = parseInt(searchParams.get('limit')) || QUERY_LIMITS.DEFAULT_PAGE_SIZE;
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
        $match: matchStage
        // Include ALL orders (both customer and guest orders)
      },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'order',
          as: 'invoice'
        }
      },
      {
        // Only include orders that have invoices
        $match: {
          'invoice.0': { $exists: true }
        }
      },
      {
        $addFields: {
          // Create a grouping key: use customer ID if exists, otherwise use order ID for guest
          groupKey: {
            $cond: {
              if: { $and: [{ $ne: ['$customer', null] }, { $ne: ['$orderType', 'guest'] }] },
              then: { $toString: '$customer' },
              else: { $concat: ['guest_', { $toString: '$_id' }] }
            }
          },
          isGuestOrder: { $eq: ['$orderType', 'guest'] },
          // Get invoice amounts
          invoiceTotalAmount: { $arrayElemAt: ['$invoice.totalAmount', 0] },
          invoicePaidAmount: { $arrayElemAt: ['$invoice.paidAmount', 0] }
        }
      },
      {
        $group: {
          _id: '$groupKey',
          isGuest: { $first: '$isGuestOrder' },
          customerId: { $first: '$customer' },
          guestOrderId: { $first: '$_id' },
          guestName: { $first: '$guestInfo.name' },
          guestPhone: { $first: '$guestInfo.phone' },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$invoiceTotalAmount' }, // Sum invoice totals
          paidAmount: { $sum: '$invoicePaidAmount' }, // Sum invoice payments
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
          }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      {
        $project: {
          customer: {
            $cond: {
              if: '$isGuest',
              then: {
                _id: { $concat: ['guest_', { $toString: '$guestOrderId' }] },
                name: { $ifNull: ['$guestName', 'Guest Customer'] },
                phone: { $ifNull: ['$guestPhone', 'N/A'] },
                email: null,
                isGuest: true
              },
              else: {
                $cond: {
                  if: { $gt: [{ $size: '$customerData' }, 0] },
                  then: {
                    _id: { $arrayElemAt: ['$customerData._id', 0] },
                    name: { $arrayElemAt: ['$customerData.name', 0] },
                    phone: { $arrayElemAt: ['$customerData.phone', 0] },
                    email: { $arrayElemAt: ['$customerData.email', 0] },
                    isGuest: false
                  },
                  else: {
                    _id: '$customerId',
                    name: 'Unknown Customer',
                    phone: 'N/A',
                    email: null,
                    isGuest: false
                  }
                }
              }
            }
          },
          totalOrders: 1,
          deliveredUnpaidOrders: 1,
          totalAmount: 1,
          paidAmount: 1,
          dueAmount: { $subtract: ['$totalAmount', '$paidAmount'] }
        }
      },
      {
        $sort: { dueAmount: -1 }
      }
    ], { maxTimeMS: QUERY_TIMEOUTS.AGGREGATION });

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
