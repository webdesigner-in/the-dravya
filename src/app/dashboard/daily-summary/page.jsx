"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingDown, Package, Calendar, Banknote } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useDailySummary } from "@/hooks/useDailySummary";
import { useAuthStore } from "@/store/authStore";

export default function DailySummaryPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin());

  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const { data, isLoading } = useDailySummary(selectedDate);

  const summary = data?.summary || {
    totalRevenue: 0, cashCollectedToday: 0, creditGiven: 0, paidOnDelivery: 0,
    expenses: 0, fuelExpense: 0, netCash: 0, deliveredOrdersCount: 0,
    totalCartons: 0, collectionRate: 0, cashCollectionsCount: 0,
  };

  const deliveredOrders  = data?.deliveredOrders  || [];
  const cashCollections  = data?.cashCollections  || [];
  const transactions     = data?.transactions     || [];
  const expenses         = transactions.filter((t) => t.type === "expense");

  const fmt = (n) => parseFloat(n || 0).toFixed(2);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">Access denied. This page is only for administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Cash Collection Summary" description="Track deliveries and actual cash collected by date" backHref="/dashboard" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={getTodayDate()} className="max-w-xs" />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>
      ) : (
        <div className="space-y-6">

          {/*  Top summary cards  */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deliveries Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{fmt(summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{summary.deliveredOrdersCount} orders delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cash Collected Today</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">₹{fmt(summary.cashCollectedToday)}</div>
                <p className="text-xs text-muted-foreground mt-1">{summary.cashCollectionsCount} payments received</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Credit Given Today</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">₹{fmt(summary.creditGiven)}</div>
                <p className="text-xs text-muted-foreground mt-1">From today&apos;s deliveries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{fmt(summary.expenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">Fuel: ₹{fmt(summary.fuelExpense)}</p>
              </CardContent>
            </Card>
          </div>

          {/*  Net cash  */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><IndianRupee className="h-5 w-5" />Net Cash in Hand</CardTitle>
              <CardDescription>Cash collected today minus expenses — regardless of delivery date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${summary.netCash >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{fmt(summary.netCash)}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-muted-foreground">Deliveries</p><p className="font-semibold">{summary.deliveredOrdersCount}</p></div>
                <div><p className="text-muted-foreground">Cartons</p><p className="font-semibold">{summary.totalCartons}</p></div>
                <div><p className="text-muted-foreground">Collection Rate</p><p className="font-semibold">{summary.collectionRate.toFixed(1)}%</p></div>
              </div>
            </CardContent>
          </Card>

          {/* ── Cash collected today (payment date based) ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-600" />
                Cash Collected Today ({cashCollections.length})
              </CardTitle>
              <CardDescription>
                Payments received on {selectedDate} — includes collections for orders delivered on earlier dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cashCollections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments collected on this date</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2">Invoice #</th>
                        <th className="pb-2 px-2">Customer</th>
                        <th className="pb-2 px-2">Order #</th>
                        <th className="pb-2 px-2">Delivered</th>
                        <th className="pb-2 px-2 text-right">Amount</th>
                        <th className="pb-2 px-2 text-center">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cashCollections.map((p, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          <td className="py-2 px-2 font-mono text-xs">{p.invoiceNumber}</td>
                          <td className="py-2 px-2">{p.customer?.name || p.guestInfo?.name || "—"}</td>
                          <td className="py-2 px-2 font-mono text-xs">{p.orderNumber || "—"}</td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">{fmtDate(p.deliveryDate)}</td>
                          <td className="py-2 px-2 text-right font-medium text-blue-600">₹{fmt(p.amount)}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant="outline" className="text-xs capitalize">{p.paymentMethod}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t font-semibold">
                      <tr>
                        <td colSpan="4" className="py-2 px-2">Total Collected</td>
                        <td className="py-2 px-2 text-right text-blue-600">₹{fmt(summary.cashCollectedToday)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Orders delivered today ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Orders Delivered Today ({summary.deliveredOrdersCount})
              </CardTitle>
              <CardDescription>
                Orders dispatched/delivered on {selectedDate} — cash may be collected on a different date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deliveredOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No deliveries on this date</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2">Order #</th>
                        <th className="pb-2 px-2">Customer</th>
                        <th className="pb-2 px-2 text-right">Amount</th>
                        <th className="pb-2 px-2 text-right">Paid at Delivery</th>
                        <th className="pb-2 px-2 text-right">Credit</th>
                        <th className="pb-2 px-2 text-center">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deliveredOrders.map((order) => {
                        const credit = parseFloat(order.finalAmount) - parseFloat(order.paidAmount || 0);
                        return (
                          <tr key={order._id} className="hover:bg-muted/50">
                            <td className="py-2 px-2 font-mono text-xs">{order.orderNumber}</td>
                            <td className="py-2 px-2">{order.customer?.name || order.guestInfo?.name}</td>
                            <td className="py-2 px-2 text-right font-medium">₹{fmt(order.finalAmount)}</td>
                            <td className="py-2 px-2 text-right text-green-600 font-medium">₹{fmt(order.paidAmount)}</td>
                            <td className="py-2 px-2 text-right text-orange-600 font-medium">₹{credit.toFixed(2)}</td>
                            <td className="py-2 px-2 text-center">
                              <Badge variant="outline" className="text-xs capitalize">{order.paymentMethod || "cash"}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t font-semibold">
                      <tr>
                        <td colSpan="2" className="py-2 px-2">Total</td>
                        <td className="py-2 px-2 text-right">₹{fmt(summary.totalRevenue)}</td>
                        <td className="py-2 px-2 text-right text-green-600">₹{fmt(summary.paidOnDelivery)}</td>
                        <td className="py-2 px-2 text-right text-orange-600">₹{fmt(summary.creditGiven)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Expenses ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Expenses ({expenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenses recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2">Description</th>
                        <th className="pb-2 px-2">Category</th>
                        <th className="pb-2 px-2 text-right">Amount</th>
                        <th className="pb-2 px-2">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {expenses.map((t) => (
                        <tr key={t._id} className="hover:bg-muted/50">
                          <td className="py-2 px-2">{t.description}</td>
                          <td className="py-2 px-2 capitalize">{t.category}</td>
                          <td className="py-2 px-2 text-right font-medium text-red-600">₹{fmt(t.amount)}</td>
                          <td className="py-2 px-2 capitalize">{t.paymentMethod}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t font-semibold">
                      <tr>
                        <td colSpan="2" className="py-2 px-2">Total Expenses</td>
                        <td className="py-2 px-2 text-right text-red-600">₹{fmt(summary.expenses)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
