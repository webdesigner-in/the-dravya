"use client";

import React, { useState, useEffect } from "react";
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
import PageHeader from "@/components/layout/PageHeader";
import { useCustomerLedger } from "@/hooks/useAnalytics";
import { useOrders } from "@/hooks/useOrders";

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
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useCustomerLedger({ month: selectedMonth });
  
  // Fetch orders for expanded customer
  // For guest customers, pass the guest order ID (which starts with "guest_")
  // The Orders API will handle extracting the actual order ID
  const { 
    data: ordersData, 
    isLoading: isLoadingOrders 
  } = useOrders({ 
    customer: expandedCustomer || undefined
  });
  
  // Flatten all pages into single array
  const allLedger = data?.pages?.flatMap(page => page.ledger) || [];
  const isAdmin = data?.pages?.[0]?.isAdmin || false;
  const summary = data?.pages?.[0]?.summary || {
    totalRevenue: 0,
    totalPaid: 0,
    totalDue: 0,
    totalCustomers: 0,
  };
  const pagination = data?.pages?.[0]?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasMore: false,
  };
  
  // Flatten orders from all pages
  const customerOrders = ordersData?.pages?.flatMap(page => page.orders) || [];
  
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

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      
      if (isNearBottom && !isLoading && !isFetchingNextPage && hasNextPage && !searchQuery) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, isFetchingNextPage, hasNextPage, searchQuery, fetchNextPage]);

  return (
    <div className="space-y-4">
      {/* Header with Month Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Ledger</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Track customer payments and outstanding dues" : "View customer payment status (Limited View)"}
            </p>
          </div>
          
          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-45">
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
          <CardContent className="py-3 px-4">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> You have access to view customer ledger information. Financial summaries are restricted to admin users only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle>
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">₹{summary.totalRevenue.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Paid</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">₹{summary.totalPaid.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Due</CardTitle>
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">₹{summary.totalDue.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Customers</CardTitle>
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{summary.totalCustomers}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : `In ${monthOptions.find(m => m.value === selectedMonth)?.label.split(' ')[0]}`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Ledger Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-base">Customer Ledger</CardTitle>
              <CardDescription className="text-xs">
                {searchQuery
                  ? `${filteredLedger.length} of ${pagination.totalItems} customers`
                  : `${pagination.totalItems} customer${pagination.totalItems !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <div className="flex gap-2">
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm h-9"
                />
                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0">
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground text-sm">
                {searchQuery ? "No customers found matching your search" : "No customer data available"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 px-2 text-xs font-medium">Customer</th>
                    <th className="pb-2 px-2 text-xs font-medium text-center">Orders</th>
                    <th className="pb-2 px-2 text-xs font-medium text-center hidden sm:table-cell">Due Orders</th>
                    <th className="pb-2 px-2 text-xs font-medium text-right">Total</th>
                    <th className="pb-2 px-2 text-xs font-medium text-right hidden md:table-cell">Paid</th>
                    <th className="pb-2 px-2 text-xs font-medium text-right">Due</th>
                    <th className="pb-2 px-2 text-xs font-medium text-center hidden lg:table-cell">Status</th>
                    <th className="pb-2 px-2 text-xs font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLedger.map((ledger, index) => (
                    <React.Fragment key={`${ledger.customer._id}-${index}`}>
                      <tr className="hover:bg-muted/50">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-xs">{ledger.customer.name}</p>
                              <p className="text-[10px] text-muted-foreground">{ledger.customer.phone}</p>
                            </div>
                            {ledger.customer.isGuest && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 shrink-0">
                                Guest
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs">{ledger.totalOrders}</td>
                        <td className="py-2.5 px-2 text-center text-xs text-orange-600 hidden sm:table-cell">{ledger.deliveredUnpaidOrders || 0}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-medium">₹{ledger.totalAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right text-xs text-green-600 hidden md:table-cell">₹{ledger.paidAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right text-xs text-red-600 font-semibold">
                          ₹{ledger.dueAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center hidden lg:table-cell">
                          {ledger.dueAmount === 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                              Paid
                            </span>
                          ) : ledger.paidAmount === 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                              Unpaid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                              Partial
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleToggleExpand(ledger.customer._id)}
                          >
                            {expandedCustomer === ledger.customer._id ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Hide</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">View</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                      {expandedCustomer === ledger.customer._id && (
                        <tr>
                          <td colSpan="8" className="p-0">
                            <div className="bg-muted/30 p-3">
                              {isLoadingOrders ? (
                                <div className="flex justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                </div>
                              ) : customerOrders.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-4">No orders found</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="text-left p-1.5 font-medium">Order #</th>
                                        <th className="text-left p-1.5 font-medium">Date</th>
                                        <th className="text-center p-1.5 font-medium hidden sm:table-cell">Items</th>
                                        <th className="text-center p-1.5 font-medium">Status</th>
                                        <th className="text-center p-1.5 font-medium hidden md:table-cell">Payment</th>
                                        <th className="text-right p-1.5 font-medium">Total</th>
                                        <th className="text-right p-1.5 font-medium hidden lg:table-cell">Paid</th>
                                        <th className="text-right p-1.5 font-medium">Due</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {customerOrders.map((order) => (
                                        <tr key={order._id} className="hover:bg-muted/50">
                                          <td className="p-1.5">
                                            <Link 
                                              href={`/dashboard/orders?customer=${ledger.customer._id}`}
                                              className="text-blue-600 hover:underline font-mono text-[10px]"
                                            >
                                              {order.orderNumber}
                                            </Link>
                                          </td>
                                          <td className="p-1.5 text-[10px]">
                                            {formatDate(order.deliveryDate || order.createdAt)}
                                          </td>
                                          <td className="p-1.5 text-center hidden sm:table-cell">{order.items?.length || 0}</td>
                                          <td className="p-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] capitalize ${
                                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                              order.status === 'out-for-delivery' ? 'bg-orange-100 text-orange-800' :
                                              'bg-blue-100 text-blue-800'
                                            }`}>
                                              {order.status}
                                            </span>
                                          </td>
                                          <td className="p-1.5 text-center hidden md:table-cell">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] capitalize ${
                                              order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                              order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'
                                            }`}>
                                              {order.paymentStatus}
                                            </span>
                                          </td>
                                          <td className="p-1.5 text-right font-medium">
                                            ₹{parseFloat(order.finalAmount || 0).toFixed(2)}
                                          </td>
                                          <td className="p-1.5 text-right text-green-600 hidden lg:table-cell">
                                            ₹{parseFloat(order.paidAmount || 0).toFixed(2)}
                                          </td>
                                          <td className="p-1.5 text-right text-red-600 font-medium">
                                            ₹{(parseFloat(order.finalAmount || 0) - parseFloat(order.paidAmount || 0)).toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-muted font-semibold">
                                      <tr>
                                        <td colSpan="5" className="p-1.5 text-right text-xs">Totals:</td>
                                        <td className="p-1.5 text-right text-xs">₹{ledger.totalAmount.toFixed(2)}</td>
                                        <td className="p-1.5 text-right text-xs text-green-600 hidden lg:table-cell">₹{ledger.paidAmount.toFixed(2)}</td>
                                        <td className="p-1.5 text-right text-xs text-red-600">₹{ledger.dueAmount.toFixed(2)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
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
          
          {/* Loading more indicator */}
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-xs text-muted-foreground">Loading more...</span>
            </div>
          )}
          
          {/* End of results indicator */}
          {!hasNextPage && !searchQuery && filteredLedger.length > 0 && (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground">No more data to load</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
