"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

export default function AnalyticsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
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

  // Use React Query for data fetching
  const { data: analytics, isLoading, error } = useAnalytics(selectedMonth);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      toast.error("Access denied. Analytics is only accessible to administrators.");
    }
  }, [isAdmin, router]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to fetch analytics");
    }
  }, [error]);

  // Prevent rendering for non-admin users
  if (!isAdmin) {
    return null;
  }

  if (!analytics?.analytics) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Comprehensive business insights and metrics</p>
          </div>
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
        <div className="flex justify-center items-center py-20">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No analytics data available</p>
          )}
        </div>
      </div>
    );
  }

  const analyticsData = analytics.analytics;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Comprehensive business insights and metrics</p>
        </div>
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

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            <span className="text-sm text-muted-foreground">Updating analytics...</span>
          </div>
        </div>
      )}

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3">Revenue Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle>
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">₹{analyticsData.revenue.total.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                From {analyticsData.revenue.orderCount} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Collected</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">
                ₹{analyticsData.revenue.collected.toFixed(2)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {analyticsData.revenue.collectionRate.toFixed(1)}% collection rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">
                ₹{analyticsData.revenue.outstanding.toFixed(2)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Pending collection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Avg Order Value</CardTitle>
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">
                ₹{analyticsData.revenue.averageOrderValue.toFixed(2)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Per order
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3">Order Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Orders</CardTitle>
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{analyticsData.orders.total}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                All orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">
                {analyticsData.orders.delivered}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {analyticsData.orders.deliveryRate.toFixed(1)}% delivery rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-yellow-600">
                {analyticsData.orders.pending}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Cancelled</CardTitle>
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">
                {analyticsData.orders.cancelled}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {analyticsData.orders.cancellationRate.toFixed(1)}% cancellation rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div>
        <h2 className="text-base font-semibold mb-3">Order Status Breakdown</h2>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(analyticsData.orders.byStatus).map(([status, count]) => (
                <div key={status} className="text-center">
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{status.replace('-', ' ')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3">Payment Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Paid Orders</CardTitle>
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">
                {analyticsData.payments.paid}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Fully paid orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Partial Payments</CardTitle>
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-yellow-600">
                {analyticsData.payments.partial}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Partially paid orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Unpaid Orders</CardTitle>
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">
                {analyticsData.payments.unpaid}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Awaiting payment
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3">Customer Insights</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Customers</CardTitle>
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{analyticsData.customers.total}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Registered customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Active Customers</CardTitle>
                <Users className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">{analyticsData.customers.withOrders}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Customers with orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Avg Orders/Customer</CardTitle>
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{analyticsData.customers.averageOrdersPerCustomer.toFixed(1)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Per active customer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Customer Lifetime Value</CardTitle>
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">₹{analyticsData.customers.averageLifetimeValue.toFixed(2)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg per customer</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3">Inventory Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Products</CardTitle>
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{analyticsData.inventory.totalProducts}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Product types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Stock</CardTitle>
                <Package className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">{analyticsData.inventory.totalStock}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cartons available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Low Stock Items</CardTitle>
                <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-yellow-600">{analyticsData.inventory.lowStockProducts}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Need restock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Out of Stock</CardTitle>
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">{analyticsData.inventory.outOfStockProducts}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unavailable items</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Metrics */}
      <div>
        <h2 className="text-base font-semibold mb-3">Invoice Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Invoices</CardTitle>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{analyticsData.invoices.total}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Generated invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Paid Invoices</CardTitle>
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">{analyticsData.invoices.paid}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fully settled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Pending Invoices</CardTitle>
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-yellow-600">{analyticsData.invoices.pending}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Overdue Invoices</CardTitle>
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">{analyticsData.invoices.overdue}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Past due date</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Customers */}
      {analyticsData.topCustomers && analyticsData.topCustomers.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Top Customers</h2>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {analyticsData.topCustomers.map((customer, index) => (
                  <div key={customer._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-[10px] text-muted-foreground">{customer.orderCount} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{customer.totalSpent.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Total spent</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products */}
      {analyticsData.topProducts && analyticsData.topProducts.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Top Selling Products</h2>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {analyticsData.topProducts.map((product, index) => (
                  <div key={product._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.size.value}{product.size.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{product.totalSold} cartons</p>
                      <p className="text-[10px] text-muted-foreground">₹{product.revenue.toFixed(2)} revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
