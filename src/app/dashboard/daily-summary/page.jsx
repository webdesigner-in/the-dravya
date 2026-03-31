"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  IndianRupee,
  TrendingDown,
  Package,
  Calendar,
  Printer,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useDailySummary } from "@/hooks/useDailySummary";
import { useAuthStore } from "@/store/authStore";

export default function DailySummaryPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  
  // Get today's date in local timezone (YYYY-MM-DD format)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const printRef = useRef();

  // Fetch daily summary data
  const { data, isLoading, error } = useDailySummary(selectedDate);

  const summary = data?.summary || {
    totalRevenue: 0,
    cashCollected: 0,
    creditGiven: 0,
    expenses: 0,
    fuelExpense: 0,
    netCash: 0,
    deliveredOrdersCount: 0,
    totalCartons: 0,
    collectionRate: 0,
  };

  const deliveredOrders = data?.deliveredOrders || [];
  const transactions = data?.transactions || [];

  const handlePrint = () => {
    window.print();
  };

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">
          Access denied. This page is only for administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Cash Collection Summary"
        description="End-of-day reconciliation and cash summary"
        backHref="/dashboard"
        actions={
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        }
      />

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayDate()}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div ref={printRef} className="space-y-6 print:space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{summary.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.deliveredOrdersCount} deliveries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cash Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{summary.cashCollected.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.collectionRate.toFixed(1)}% of revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Credit Given
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{summary.creditGiven.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending collection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{summary.expenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fuel: ₹{summary.fuelExpense.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Net Cash */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Net Cash in Hand
              </CardTitle>
              <CardDescription>
                Cash collected minus expenses for {selectedDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`text-4xl font-bold ${
                  summary.netCash >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ₹{summary.netCash.toFixed(2)}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Deliveries</p>
                  <p className="font-semibold">{summary.deliveredOrdersCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cartons Delivered</p>
                  <p className="font-semibold">{summary.totalCartons}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Collection Rate</p>
                  <p className="font-semibold">
                    {summary.collectionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivered Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivered Orders ({summary.deliveredOrdersCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveredOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No deliveries on this date
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2">Order #</th>
                        <th className="pb-2 px-2">Customer</th>
                        <th className="pb-2 px-2 text-right">Amount</th>
                        <th className="pb-2 px-2 text-right">Paid</th>
                        <th className="pb-2 px-2 text-right">Due</th>
                        <th className="pb-2 px-2 text-center">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deliveredOrders.map((order) => {
                        const due =
                          parseFloat(order.finalAmount) -
                          parseFloat(order.paidAmount || 0);
                        return (
                          <tr key={order._id} className="hover:bg-muted/50">
                            <td className="py-2 px-2 font-mono text-xs">
                              {order.orderNumber}
                            </td>
                            <td className="py-2 px-2">
                              {order.customer?.name || order.guestInfo?.name}
                            </td>
                            <td className="py-2 px-2 text-right font-medium">
                              ₹{parseFloat(order.finalAmount).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right text-green-600 font-medium">
                              ₹{parseFloat(order.paidAmount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right text-orange-600 font-medium">
                              ₹{due.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`text-xs px-2 py-1 rounded capitalize ${
                                  order.paymentTerms === "cash"
                                    ? "bg-green-100 text-green-700"
                                    : order.paymentTerms === "credit"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {order.paymentTerms}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t font-semibold">
                      <tr>
                        <td colSpan="2" className="py-2 px-2">
                          Total
                        </td>
                        <td className="py-2 px-2 text-right">
                          ₹{summary.totalRevenue.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-green-600">
                          ₹{summary.cashCollected.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-orange-600">
                          ₹{summary.creditGiven.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Expenses ({transactions.filter((t) => t.type === "expense").length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.filter((t) => t.type === "expense").length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No expenses recorded
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 px-2">Description</th>
                        <th className="pb-2 px-2">Category</th>
                        <th className="pb-2 px-2 text-right">Amount</th>
                        <th className="pb-2 px-2">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions
                        .filter((t) => t.type === "expense")
                        .map((transaction) => (
                          <tr
                            key={transaction._id}
                            className="hover:bg-muted/50"
                          >
                            <td className="py-2 px-2">
                              {transaction.description}
                            </td>
                            <td className="py-2 px-2 capitalize">
                              {transaction.category}
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-red-600">
                              ₹{parseFloat(transaction.amount).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 capitalize">
                              {transaction.paymentMethod}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t font-semibold">
                      <tr>
                        <td colSpan="2" className="py-2 px-2">
                          Total Expenses
                        </td>
                        <td className="py-2 px-2 text-right text-red-600">
                          ₹{summary.expenses.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          ${printRef.current} * {
            visibility: visible;
          }
          ${printRef.current} {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
