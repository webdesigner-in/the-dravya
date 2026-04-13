import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';
import { QUERY_LIMITS, QUERY_TIMEOUTS } from '@/lib/constants';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get('page'))  || 1);
    const limit  = Math.min(100, parseInt(searchParams.get('limit')) || QUERY_LIMITS.DEFAULT_PAGE_SIZE);
    const month  = searchParams.get('month');
    const isAdmin = authUser.role === 'admin';

    const mongoose = await import('mongoose');

    const matchStage = isAdmin
      ? {}
      : { createdBy: new mongoose.default.Types.ObjectId(authUser.userId) };

    if (month && month !== 'all') {
      const [year, monthNum] = month.split('-');
      matchStage.createdAt = {
        $gte: new Date(parseInt(year), parseInt(monthNum) - 1, 1),
        $lte: new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999),
      };
    }

    // Build the core aggregation pipeline (without pagination stages)
    const corePipeline = [
      { $match: matchStage },

      // Only orders that have an invoice
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'order',
          as: 'invoice',
        },
      },
      { $match: { 'invoice.0': { $exists: true } } },

      {
        $addFields: {
          groupKey: {
            $cond: {
              if: { $and: [{ $ne: ['$customer', null] }, { $ne: ['$orderType', 'guest'] }] },
              then: { $toString: '$customer' },
              else: { $toString: '$_id' },
            },
          },
          isGuestOrder:        { $eq: ['$orderType', 'guest'] },
          invoiceTotalAmount:  { $arrayElemAt: ['$invoice.totalAmount',   0] },
          invoicePaidAmount:   { $arrayElemAt: ['$invoice.paidAmount',    0] },
          invoiceBalanceAmount:{ $arrayElemAt: ['$invoice.balanceAmount', 0] },
        },
      },

      {
        $group: {
          _id:          '$groupKey',
          isGuest:      { $first: '$isGuestOrder' },
          customerId:   { $first: '$customer' },
          guestOrderId: { $first: '$_id' },
          guestName:    { $first: '$guestInfo.name' },
          guestPhone:   { $first: '$guestInfo.phone' },
          totalOrders:  { $sum: 1 },
          totalAmount:  { $sum: '$invoiceTotalAmount' },
          paidAmount:   { $sum: '$invoicePaidAmount' },
          dueAmount:    { $sum: '$invoiceBalanceAmount' },
          deliveredUnpaidOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $in: ['$paymentStatus', ['unpaid', 'partial']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerData',
        },
      },

      {
        $project: {
          customer: {
            $cond: {
              if: '$isGuest',
              then: {
                _id:     { $toString: '$guestOrderId' },
                name:    { $ifNull: ['$guestName',  'Guest Customer'] },
                phone:   { $ifNull: ['$guestPhone', ''] },
                email:   null,
                isGuest: true,
              },
              else: {
                $cond: {
                  if: { $gt: [{ $size: '$customerData' }, 0] },
                  then: {
                    _id:     { $arrayElemAt: ['$customerData._id',   0] },
                    name:    { $arrayElemAt: ['$customerData.name',  0] },
                    phone:   { $arrayElemAt: ['$customerData.phone', 0] },
                    email:   { $arrayElemAt: ['$customerData.email', 0] },
                    isGuest: false,
                  },
                  else: {
                    _id:     '$customerId',
                    name:    'Unknown Customer',
                    phone:   '',
                    email:   null,
                    isGuest: false,
                  },
                },
              },
            },
          },
          totalOrders:           1,
          deliveredUnpaidOrders: 1,
          totalAmount:           1,
          paidAmount:            1,
          dueAmount:             1,
        },
      },

      { $sort: { dueAmount: -1 } },
    ];

    // Run count and paginated data in parallel
    const [countResult, ledgerData] = await Promise.all([
      Order.aggregate([
        ...corePipeline,
        { $count: 'total' },
      ], { maxTimeMS: QUERY_TIMEOUTS.AGGREGATION }),

      Order.aggregate([
        ...corePipeline,
        { $skip:  (page - 1) * limit },
        { $limit: limit },
      ], { maxTimeMS: QUERY_TIMEOUTS.AGGREGATION }),
    ]);

    const totalItems = countResult[0]?.total || 0;

    // Summary totals — only for admin, run a separate lightweight aggregation
    let summary = null;
    if (isAdmin) {
      const totalsResult = await Order.aggregate([
        ...corePipeline,
        {
          $group: {
            _id:          null,
            totalRevenue: { $sum: '$totalAmount' },
            totalPaid:    { $sum: '$paidAmount' },
            totalDue:     { $sum: '$dueAmount' },
          },
        },
      ], { maxTimeMS: QUERY_TIMEOUTS.AGGREGATION });

      const t = totalsResult[0] || {};
      summary = {
        totalRevenue:    t.totalRevenue    || 0,
        totalPaid:       t.totalPaid       || 0,
        totalDue:        t.totalDue        || 0,
        totalCustomers:  totalItems,
      };
    }

    return NextResponse.json({
      success: true,
      ledger: ledgerData,
      summary,
      isAdmin,
      pagination: {
        currentPage: page,
        totalPages:  Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasMore: page < Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to fetch customer ledger');
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
