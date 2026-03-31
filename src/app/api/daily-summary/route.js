import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Transaction from "@/models/Transaction";
import { getAuthUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can view daily summary." },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Parse the date in local timezone to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    
    // Create start and end of day in local timezone
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Fetch delivered orders for the selected date
    // Use deliveryDate (scheduled delivery date) as the primary filter
    // If deliveryDate is not set, fall back to createdAt (order creation date)
    const deliveredOrders = await Order.find({
      status: "delivered",
      $or: [
        {
          deliveryDate: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
        {
          deliveryDate: null,
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      ],
    })
      .populate("customer", "name phone")
      .populate("items.product", "name size")
      .sort({ deliveryDate: -1, createdAt: -1 })
      .lean();

    // Fetch transactions for the selected date
    const transactions = await Transaction.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("customer", "name")
      .populate("order", "orderNumber")
      .sort({ date: -1 })
      .lean();

    // Calculate summary
    const totalRevenue = deliveredOrders.reduce(
      (sum, order) => sum + parseFloat(order.finalAmount || 0),
      0
    );

    const cashCollected = deliveredOrders.reduce(
      (sum, order) => sum + parseFloat(order.paidAmount || 0),
      0
    );

    const creditGiven = totalRevenue - cashCollected;

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const fuelExpense = transactions
      .filter((t) => t.type === "expense" && t.category === "fuel")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const netCash = cashCollected - expenses;

    const totalCartons = deliveredOrders.reduce((sum, order) => {
      return (
        sum +
        (order.items?.reduce(
          (itemSum, item) => itemSum + (item.quantity || 0),
          0
        ) || 0)
      );
    }, 0);

    return NextResponse.json({
      success: true,
      date,
      summary: {
        totalRevenue,
        cashCollected,
        creditGiven,
        expenses,
        fuelExpense,
        netCash,
        deliveredOrdersCount: deliveredOrders.length,
        totalCartons,
        collectionRate: totalRevenue > 0 ? (cashCollected / totalRevenue) * 100 : 0,
      },
      deliveredOrders: deliveredOrders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        guestInfo: order.guestInfo,
        orderType: order.orderType,
        finalAmount: order.finalAmount,
        paidAmount: order.paidAmount,
        paymentTerms: order.paymentTerms,
        items: order.items,
        deliveryDate: order.deliveryDate,
        createdAt: order.createdAt,
      })),
      transactions: transactions.map((t) => ({
        _id: t._id,
        transactionNumber: t.transactionNumber,
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        paymentMethod: t.paymentMethod,
        customer: t.customer,
        order: t.order,
        date: t.date,
      })),
    });
  } catch (error) {
    console.error("Daily summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily summary" },
      { status: 500 }
    );
  }
}
