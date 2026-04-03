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

    // ── 1. Orders DELIVERED on this date ─────────────────────────────────────
    // Use deliveryDate if set. Fall back to createdAt (order creation date) — never
    // updatedAt, because recording a payment updates updatedAt and would cause orders
    // delivered on earlier dates to appear in today's delivery list.
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
      .sort({ deliveryDate: -1, updatedAt: -1 })
      .lean();

    // ── 2. Cash COLLECTED on this date (from invoice payment history) ─────────
    // For distributors, only show payments on invoices linked to their orders
    let invoiceFilter = { "paymentHistory.date": { $gte: startOfDay, $lte: endOfDay } };
    if (!isAdmin) {
      const userOrderIds = await Order.find({ createdBy: authUser.userId })
        .select('_id').lean();
      invoiceFilter.order = { $in: userOrderIds.map(o => o._id) };
    }

    const invoicesWithPayments = await Invoice.find(invoiceFilter)
      .populate("customer", "name phone")
      .populate("order", "orderNumber orderType guestInfo deliveryDate")
      .lean();

    // Extract only the payment entries that fall on this date
    const cashCollections = [];
    for (const invoice of invoicesWithPayments) {
      const paymentsOnDate = invoice.paymentHistory.filter((p) => {
        const pDate = new Date(p.date);
        return pDate >= startOfDay && pDate <= endOfDay;
      });
      for (const payment of paymentsOnDate) {
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

    // ── 3. Expenses on this date (admin only — expenses are business-wide) ────
    const transactions = isAdmin ? await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("customer", "name")
      .populate("order", "orderNumber")
      .sort({ date: -1 })
      .lean() : [];

    // ── Summary calculations ──────────────────────────────────────────────────
    // Revenue = value of orders delivered today
    const totalRevenue = deliveredOrders.reduce(
      (sum, o) => sum + parseFloat(o.finalAmount || 0), 0
    );

    // Cash collected = actual payments received today (regardless of delivery date)
    const cashCollectedToday = cashCollections.reduce(
      (sum, p) => sum + parseFloat(p.amount || 0), 0
    );

    // Credit given today = revenue from today's deliveries that was NOT collected today
    // (may be collected on a future date)
    const paidOnDelivery = deliveredOrders.reduce(
      (sum, o) => sum + parseFloat(o.paidAmount || 0), 0
    );
    const creditGiven = Math.max(0, totalRevenue - paidOnDelivery);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const fuelExpense = transactions
      .filter((t) => t.type === "expense" && t.category === "fuel")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    // Net cash = what actually came in today minus what went out today
    const netCash = cashCollectedToday - expenses;

    const totalCartons = deliveredOrders.reduce(
      (sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      date,
      isAdmin,
      summary: {
        // Delivery-based (what went out today)
        totalRevenue,
        deliveredOrdersCount: deliveredOrders.length,
        totalCartons,
        creditGiven,
        paidOnDelivery,
        // Collection-based (what came in today)
        cashCollectedToday,
        cashCollectionsCount: cashCollections.length,
        // Expenses
        expenses,
        fuelExpense,
        // Net
        netCash,
        collectionRate: totalRevenue > 0 ? (paidOnDelivery / totalRevenue) * 100 : 0,
      },
      // Orders delivered today
      deliveredOrders: deliveredOrders.map((o) => ({
        _id:          o._id,
        orderNumber:  o.orderNumber,
        customer:     o.customer,
        guestInfo:    o.guestInfo,
        orderType:    o.orderType,
        finalAmount:  o.finalAmount,
        paidAmount:   o.paidAmount,
        paymentMethod: o.paymentMethod,
        items:        o.items,
        deliveryDate: o.deliveryDate,
        createdAt:    o.createdAt,
      })),
      // Cash actually collected today (may be for orders delivered on earlier dates)
      cashCollections,
      // Expenses today
      transactions: transactions.map((t) => ({
        _id:              t._id,
        transactionNumber: t.transactionNumber,
        type:             t.type,
        category:         t.category,
        amount:           t.amount,
        description:      t.description,
        paymentMethod:    t.paymentMethod,
        customer:         t.customer,
        order:            t.order,
        date:             t.date,
      })),
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, "Failed to fetch daily summary");
    return NextResponse.json({ error: errorMessage, details }, { status: statusCode });
  }
}
