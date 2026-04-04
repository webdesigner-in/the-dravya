"use client";

import React, { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useCustomerLedger } from "@/hooks/useAnalytics";
import { useOrders } from "@/hooks/useOrders";

// Isolated component so each expanded customer fetches its own orders independently
function CustomerOrders({ customerId, ledger, formatDate }) {
  const { data: ordersData, isLoading } = useOrders({ customer: customerId || undefined });
  const orders = ordersData?.pages?.flatMap(page => page.orders) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
      </div>
    );
  }
  if (orders.length === 0) {
    return <p className="text-center text-[9px] sm:text-[10px] text-muted-foreground py-3">No orders found</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] sm:text-[10px]">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-1 sm:p-1.5 font-medium text-[8px] sm:text-[9px]">Order</th>
            <th className="text-left p-1 sm:p-1.5 font-medium text-[8px] sm:text-[9px]">Date</th>
            <th className="text-center p-1 sm:p-1.5 font-medium text-[8px] sm:text-[9px]">Status</th>
            <th className="text-right p-1 sm:p-1.5 font-medium text-[8px] sm:text-[9px]">Total</th>
            <th className="text-right p-1 sm:p-1.5 font-medium text-[8px] sm:text-[9px]">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => {
            return (
              <tr key={order._id} className="hover:bg-muted/50">
              <td className="p-1 sm:p-1.5">
                <Link
                  href={`/dashboard/orders?customer=${customerId}`}
                  className="text-blue-600 hover:underline font-mono text-[8px] sm:text-[9px]"
                >
                  {order.orderNumber}
                </Link>
              </td>
              <td className="p-1 sm:p-1.5 text-[8px] sm:text-[9px]">
                {formatDate(order.deliveryDate || order.createdAt)}
              </td>
              <td className="p-1 sm:p-1.5 text-center">
                <span className={`inline-flex items-center px-0.5 py-0.5 rounded text-[7px] sm:text-[8px] capitalize ${
                  order.status === 'delivered'        ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled'        ? 'bg-red-100 text-red-800' :
                  order.status === 'out-for-delivery' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order.status}
                </span>
              </td>
              <td className="p-1 sm:p-1.5 text-right font-medium text-[8px] sm:text-[9px]">
                ₹{parseFloat(order.finalAmount || 0).toFixed(2)}
              </td>
              <td className="p-1 sm:p-1.5 text-right text-red-600 font-medium text-[8px] sm:text-[9px]">
                ₹{(parseFloat(order.finalAmount || 0) - parseFloat(order.paidAmount || 0)).toFixed(2)}
              </td>
            </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted font-semibold">
          <tr>
            <td colSpan="3" className="p-1 sm:p-1.5 text-right text-[8px] sm:text-[9px]">Totals:</td>
            <td className="p-1 sm:p-1.5 text-right text-[8px] sm:text-[9px]">₹{ledger.totalAmount.toFixed(2)}</td>
            <td className="p-1 sm:p-1.5 text-right text-[8px] sm:text-[9px] text-red-600">₹{ledger.dueAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("all");
  
  // Generate last 12 months options
  const monthOptions = React.useMemo(() => {
    const options = [{ value: "all", label: "All Time" }];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    return options;
  }, []);
  
  // React Query hooks with infinite scroll
  const { data, isLoading } = useCustomerLedger({ month: selectedMonth });

  const allLedger = data?.ledger || [];
  const isAdmin   = data?.isAdmin || false;
  const summary   = data?.summary || { totalRevenue: 0, totalPaid: 0, totalDue: 0, totalCustomers: 0 };

  // Filter ledger based on search query
  const filteredLedger = searchQuery.trim() === ""
    ? allLedger
    : allLedger.filter(
        (item) =>
          item.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.customer?.phone?.includes(searchQuery)
      );

  const handleToggleExpand = (customerId) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(customerId);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="space-y-2 p-2 sm:p-0 sm:space-y-4">
      {/* Header with Month Filter */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-2">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Customer Ledger</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {isAdmin ? "Track payments and dues" : "View payment status"}
            </p>
          </div>
          
          {/* Month Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-45 h-8 text-xs sm:h-9 sm:text-sm">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Info message for distributors */}
      {!isAdmin && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-1.5 px-2 sm:py-2 sm:px-3">
            <p className="text-[9px] sm:text-[10px] text-blue-800">
              <strong>Note:</strong> Financial summaries are admin-only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
          <Card>
            <CardHeader className="pb-1 px-2 pt-2 sm:pb-1.5 sm:px-3 sm:pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Revenue</CardTitle>
                <IndianRupee className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3">
              <div className="text-sm sm:text-base lg:text-lg font-bold">₹{summary.totalRevenue.toFixed(2)}</div>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label.split(' ')[0]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 px-2 pt-2 sm:pb-1.5 sm:px-3 sm:pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Paid</CardTitle>
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-green-600">₹{summary.totalPaid.toFixed(2)}</div>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label.split(' ')[0]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 px-2 pt-2 sm:pb-1.5 sm:px-3 sm:pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Due</CardTitle>
                <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-red-600">₹{summary.totalDue.toFixed(2)}</div>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label.split(' ')[0]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 px-2 pt-2 sm:pb-1.5 sm:px-3 sm:pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Customers</CardTitle>
                <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3">
              <div className="text-sm sm:text-base lg:text-lg font-bold">{summary.totalCustomers}</div>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label.split(' ')[0]}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Ledger Table */}
      <Card>
        <CardHeader className="pb-1.5 px-2 pt-2 sm:pb-2 sm:px-3 sm:pt-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-2">
            <div>
              <CardTitle className="text-xs sm:text-sm lg:text-base">Customer Ledger</CardTitle>
              <CardDescription className="text-[9px] sm:text-[10px]">
                {searchQuery
                  ? `${filteredLedger.length} of ${allLedger.length}`
                  : `${allLedger.length} customer${allLedger.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <div className="flex gap-1">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[11px] sm:text-xs h-7 sm:h-8"
                />
                <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                  <Search className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-3 pb-2 sm:pb-3">
          {isLoading ? (
            <div className="flex justify-center py-4 sm:py-6">
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="text-center py-4 sm:py-6">
              <FileText className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
              <p className="mt-2 text-muted-foreground text-[10px] sm:text-xs">
                {searchQuery ? "No customers found" : "No data available"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-1.5 px-1.5 sm:pb-2 sm:px-2 text-[9px] sm:text-[10px] font-medium">Customer</th>
                    <th className="pb-1.5 px-1.5 sm:pb-2 sm:px-2 text-[9px] sm:text-[10px] font-medium text-center">Orders</th>
                    <th className="pb-1.5 px-1.5 sm:pb-2 sm:px-2 text-[9px] sm:text-[10px] font-medium text-right">Total</th>
                    <th className="pb-1.5 px-1.5 sm:pb-2 sm:px-2 text-[9px] sm:text-[10px] font-medium text-right">Due</th>
                    <th className="pb-1.5 px-1.5 sm:pb-2 sm:px-2 text-[9px] sm:text-[10px] font-medium text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLedger.map((ledger, index) => (
                    <React.Fragment key={`${ledger.customer._id}-${index}`}>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1.5 px-1.5 sm:py-2 sm:px-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-[10px] sm:text-[11px]">{ledger.customer.name}</p>
                              {ledger.customer.isGuest && (
                                <span className="inline-flex items-center px-0.5 py-0.5 rounded text-[8px] sm:text-[9px] font-medium bg-purple-100 text-purple-700">
                                  Guest
                                </span>
                              )}
                            </div>
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground">{ledger.customer.phone}</p>
                          </div>
                        </td>
                        <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">
                          <div className="text-[10px] sm:text-[11px] font-medium">{ledger.totalOrders}</div>
                          {ledger.deliveredUnpaidOrders > 0 && (
                            <div className="text-[8px] sm:text-[9px] text-orange-600">{ledger.deliveredUnpaidOrders} due</div>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right">
                          <div className="text-[10px] sm:text-[11px] font-medium">₹{ledger.totalAmount.toFixed(2)}</div>
                          <div className="text-[8px] sm:text-[9px] text-green-600">₹{ledger.paidAmount.toFixed(2)}</div>
                        </td>
                        <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right">
                          <div className="text-[10px] sm:text-[11px] text-red-600 font-semibold">
                            ₹{ledger.dueAmount.toFixed(2)}
                          </div>
                          <div className="mt-0.5">
                            {ledger.dueAmount === 0 ? (
                              <span className="inline-flex items-center px-0.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-medium bg-green-100 text-green-800">
                                Paid
                              </span>
                            ) : ledger.paidAmount === 0 ? (
                              <span className="inline-flex items-center px-0.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-medium bg-red-100 text-red-800">
                                Unpaid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-0.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-medium bg-yellow-100 text-yellow-800">
                                Partial
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 text-[9px] px-1.5 sm:h-7 sm:text-[10px] sm:px-2"
                            onClick={() => handleToggleExpand(ledger.customer._id)}
                          >
                            {expandedCustomer === ledger.customer._id ? (
                              <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            ) : (
                              <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      {expandedCustomer === ledger.customer._id && (
                        <tr>
                          <td colSpan="5" className="p-0">
                            <div className="bg-muted/30 p-1.5 sm:p-2">
                              <CustomerOrders
                                customerId={ledger.customer._id}
                                ledger={ledger}
                                formatDate={formatDate}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
