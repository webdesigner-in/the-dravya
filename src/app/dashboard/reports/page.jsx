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
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useCustomerLedger } from "@/hooks/useAnalytics";
import { useOrders } from "@/hooks/useOrders";

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  
  // React Query hooks with infinite scroll
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useCustomerLedger({});
  const { data: ordersData, isLoading: isLoadingOrders } = useOrders({ 
    customer: expandedCustomer,
    page: 1,
    limit: 100
  }, { enabled: !!expandedCustomer });
  
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
  
  const customerOrders = ordersData?.orders || [];
  
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
    <div className="space-y-6">
      <PageHeader
        title="Customer Ledger"
        description={isAdmin ? "Track customer payments and outstanding dues" : "View customer payment status (Limited View)"}
      />

      {/* Info message for distributors */}
      {!isAdmin && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You have access to view customer ledger information. Financial summaries are restricted to admin users only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From all orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Received payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Due</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{summary.totalDue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Outstanding amount
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Active customers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Ledger Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Customer Ledger</CardTitle>
              <CardDescription>
                {searchQuery
                  ? `${filteredLedger.length} of ${pagination.totalItems} customers`
                  : `${pagination.totalItems} customer${pagination.totalItems !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex gap-2">
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <Button size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? "No customers found matching your search" : "No customer data available"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 px-2 text-sm font-medium">Customer</th>
                    <th className="pb-3 px-2 text-sm font-medium text-center">Total Orders</th>
                    <th className="pb-3 px-2 text-sm font-medium text-center">Due Orders</th>
                    <th className="pb-3 px-2 text-sm font-medium text-right">Total Amount</th>
                    <th className="pb-3 px-2 text-sm font-medium text-right">Paid</th>
                    <th className="pb-3 px-2 text-sm font-medium text-right">Due</th>
                    <th className="pb-3 px-2 text-sm font-medium text-center">Status</th>
                    <th className="pb-3 px-2 text-sm font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLedger.map((ledger, index) => (
                    <React.Fragment key={`${ledger.customer._id}-${index}`}>
                      <tr className="hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-sm">{ledger.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{ledger.customer.phone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-sm">{ledger.totalOrders}</td>
                        <td className="py-3 px-2 text-center text-sm text-orange-600">{ledger.deliveredUnpaidOrders || 0}</td>
                        <td className="py-3 px-2 text-right text-sm">₹{ledger.totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-sm text-green-600">₹{ledger.paidAmount.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-sm text-red-600 font-medium">
                          ₹{ledger.dueAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {ledger.dueAmount === 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Paid
                            </span>
                          ) : ledger.paidAmount === 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Unpaid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Partial
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleExpand(ledger.customer._id)}
                          >
                            {expandedCustomer === ledger.customer._id ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide Orders
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                View Orders
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                      {expandedCustomer === ledger.customer._id && (
                        <tr>
                          <td colSpan="8" className="p-0">
                            <div className="bg-muted/30 p-4">
                              {isLoadingOrders ? (
                                <div className="flex justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                </div>
                              ) : customerOrders.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-4">No orders found</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="text-left p-2 font-medium">Order #</th>
                                        <th className="text-left p-2 font-medium">Date</th>
                                        <th className="text-center p-2 font-medium">Items</th>
                                        <th className="text-center p-2 font-medium">Status</th>
                                        <th className="text-center p-2 font-medium">Payment</th>
                                        <th className="text-right p-2 font-medium">Total</th>
                                        <th className="text-right p-2 font-medium">Paid</th>
                                        <th className="text-right p-2 font-medium">Due</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {customerOrders.map((order) => (
                                        <tr key={order._id} className="hover:bg-muted/50">
                                          <td className="p-2">
                                            <Link 
                                              href={`/dashboard/orders?customer=${ledger.customer._id}`}
                                              className="text-blue-600 hover:underline font-mono text-xs"
                                            >
                                              {order.orderNumber}
                                            </Link>
                                          </td>
                                          <td className="p-2 text-xs">
                                            {formatDate(order.deliveryDate || order.createdAt)}
                                          </td>
                                          <td className="p-2 text-center">{order.items?.length || 0}</td>
                                          <td className="p-2 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs capitalize ${
                                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                              order.status === 'out-for-delivery' ? 'bg-orange-100 text-orange-800' :
                                              'bg-blue-100 text-blue-800'
                                            }`}>
                                              {order.status}
                                            </span>
                                          </td>
                                          <td className="p-2 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs capitalize ${
                                              order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                              order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'
                                            }`}>
                                              {order.paymentStatus}
                                            </span>
                                          </td>
                                          <td className="p-2 text-right font-medium">
                                            ₹{parseFloat(order.finalAmount || 0).toFixed(2)}
                                          </td>
                                          <td className="p-2 text-right text-green-600">
                                            ₹{parseFloat(order.paidAmount || 0).toFixed(2)}
                                          </td>
                                          <td className="p-2 text-right text-red-600 font-medium">
                                            ₹{(parseFloat(order.finalAmount || 0) - parseFloat(order.paidAmount || 0)).toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-muted font-semibold">
                                      <tr>
                                        <td colSpan="5" className="p-2 text-right">Totals:</td>
                                        <td className="p-2 text-right">₹{ledger.totalAmount.toFixed(2)}</td>
                                        <td className="p-2 text-right text-green-600">₹{ledger.paidAmount.toFixed(2)}</td>
                                        <td className="p-2 text-right text-red-600">₹{ledger.dueAmount.toFixed(2)}</td>
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
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
            </div>
          )}
          
          {/* End of results indicator */}
          {!hasNextPage && !searchQuery && filteredLedger.length > 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No more data to load</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
