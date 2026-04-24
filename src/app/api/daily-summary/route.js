import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice";
import Transaction from "@/models/Transaction";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errorHandler";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const isAdmin = authUser.role === "admin";
    const userFilter = isAdmin ? {} : { createdBy: authUser.userId };

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const [year, month, day] = date.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay   = new Date(year, month - 1, day, 23, 59, 59, 999);

    // ── Pre-fetch user's order IDs once (for non-admin filtering) ─────────────
    let userOrderIds = null;
    if (!isAdmin) {
      const oids = await Order.find({ createdBy: authUser.userId }).select('_id').lean();
      userOrderIds = oids.map(o => o._id);
    }

    // ── 1. Orders DELIVERED on this date ─────────────────────────────────────
    // deliveryDate takes priority; fall back to createdAt (never updatedAt —
    // recording a payment updates updatedAt and would cause stale orders to appear)
    const deliveredOrders = await Order.find({
      ...userFilter,
      status: "delivered",
      $or: [
        { deliveryDate: { $gte: startOfDay, $lte: endOfDay } },
        { deliveryDate: null, createdAt: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .populate("customer", "name phone")
      .populate("items.product", "name size")
      .sort({ deliveryDate: -1, createdAt: -1 })
      .lean();

    // ── 2. Cash COLLECTED on this date ───────────────────────────────────────
    // Source of truth: income Transaction records dated today.
    // Every payment (invoice or direct) creates a Transaction.
    // Refunded/reversed transactions are excluded.
    const incomeTxFilter = {
      type: 'income',
      paymentStatus: { $ne: 'refunded' },
      date: { $gte: startOfDay, $lte: endOfDay },
      ...(userOrderIds ? { order: { $in: userOrderIds } } : {}),
    };

    const incomeTxToday = await Transaction.find(incomeTxFilter)
      .populate("customer", "name phone")
      .populate("order", "orderNumber orderType guestInfo deliveryDate")
      .lean();

    const cashCollectedToday = incomeTxToday.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0), 0
    );

    // ── 3. Detailed cash collections from invoice payment history ─────────────
    // Used for the display table — shows which invoice each payment belongs to.
    const invoiceFilter = {
      "paymentHistory.date": { $gte: startOfDay, $lte: endOfDay },
      ...(userOrderIds ? { order: { $in: userOrderIds } } : {}),
    };

    const invoicesWithPayments = await Invoice.find(invoiceFilter)
      .populate("customer", "name phone")
      .populate("order", "orderNumber orderType guestInfo deliveryDate")
      .lean();

    const cashCollections = [];
    for (const invoice of invoicesWithPayments) {
      const paymentsOnDate = invoice.paymentHistory.filter((p) => {
        const pDate = new Date(p.date);
        return pDate >= startOfDay && pDate <= endOfDay;
      });
      for (const payment of paymentsOnDate) {
        // Skip the reset audit entries (amount = 0)
        if (!payment.amount || payment.amount === 0) continue;
        cashCollections.push({
          invoiceId:     invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customer:      invoice.customer,
          guestInfo:     invoice.guestInfo,
          orderNumber:   invoice.order?.orderNumber,
          deliveryDate:  invoice.order?.deliveryDate,
          amount:        payment.amount,
          paymentMethod: payment.paymentMethod,
          date:          payment.date,
          notes:         payment.notes,
        });
      }
    }

    // ── 4. Expenses on this date (admin only) ─────────────────────────────────
    const expenseTransactions = isAdmin
      ? await Transaction.find({
          type: 'expense',
          date: { $gte: startOfDay, $lte: endOfDay },
        })
          .populate("customer", "name")
          .populate("order", "orderNumber")
          .sort({ date: -1 })
          .lean()
      : [];

    // ── Summary calculations ──────────────────────────────────────────────────

    // Revenue = total value of orders delivered today (what went out)
    const totalRevenue = deliveredOrders.reduce(
      (sum, o) => sum + parseFloat(o.finalAmount || 0), 0
    );

    // Paid at delivery = cash collected at the time of delivery (same-day orders)
    const paidOnDelivery = deliveredOrders.reduce(
      (sum, o) => sum + parseFloat(o.paidAmount || 0), 0
    );

    // Credit given = delivered today but not yet paid (will be collected later)
    const creditGiven = Math.max(0, totalRevenue - paidOnDelivery);

    // Expenses = all expense transactions today
    const expenses = expenseTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0), 0
    );

    const fuelExpense = expenseTransactions
      .filter((t) => t.category === "fuel")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    // Net cash = cash actually received today (from any order, past or present)
    //            minus expenses paid today
    const netCash = cashCollectedToday - expenses;

    const totalCartons = deliveredOrders.reduce(
      (sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0),
      0
    );

    // Collection rate = % of today's delivery revenue collected at delivery
    const collectionRate = totalRevenue > 0 ? (paidOnDelivery / totalRevenue) * 100 : 0;

    return NextResponse.json({
      success: true,
      date,
      isAdmin,
      summary: {
        // Delivery-based (what went out today)
        totalRevenue,
        deliveredOrdersCount: deliveredOrders.length,
        totalCartons,
        paidOnDelivery,
        creditGiven,
        // Collection-based (what came in today — includes past-order payments)
        cashCollectedToday,
        cashCollectionsCount: cashCollections.length,
        // Expenses (admin only)
        expenses,
        fuelExpense,
        // Net cash in hand
        netCash,
        collectionRate,
      },
      deliveredOrders: deliveredOrders.map((o) => ({
        _id:           o._id,
        orderNumber:   o.orderNumber,
        customer:      o.customer,
        guestInfo:     o.guestInfo,
        orderType:     o.orderType,
        finalAmount:   o.finalAmount,
        paidAmount:    o.paidAmount,
        paymentMethod: o.paymentMethod,
        items:         o.items,
        deliveryDate:  o.deliveryDate,
        createdAt:     o.createdAt,
      })),
      cashCollections,
      transactions: expenseTransactions.map((t) => ({
        _id:               t._id,
        transactionNumber: t.transactionNumber,
        type:              t.type,
        category:          t.category,
        amount:            t.amount,
        description:       t.description,
        paymentMethod:     t.paymentMethod,
        customer:          t.customer,
        order:             t.order,
        date:              t.date,
      })),
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, "Failed to fetch daily summary");
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
