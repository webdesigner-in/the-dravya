"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  Card,
  CardContent,
  CardDescription,
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  FileText,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

export default function AnalyticsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      toast.error("Access denied. Analytics is only accessible to administrators.");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [timeRange, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        toast.error("Failed to fetch analytics");
      }
    } catch (error) {
      toast.error("Failed to fetch analytics");
      } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  // Prevent rendering for non-admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        description="Comprehensive business insights and metrics"
        action={
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{analytics.revenue.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From {analytics.revenue.orderCount} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{analytics.revenue.collected.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.revenue.collectionRate.toFixed(1)}% collection rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{analytics.revenue.outstanding.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending collection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{analytics.revenue.averageOrderValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per order
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Order Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.orders.total}</div>
              <p className="text-xs text-muted-foreground">
                All orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.orders.delivered}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.orders.deliveryRate.toFixed(1)}% delivery rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.orders.pending}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics.orders.cancelled}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.orders.cancellationRate.toFixed(1)}% cancellation rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Order Status Breakdown</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(analytics.orders.byStatus).map(([status, count]) => (
                <div key={status} className="text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Payment Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.payments.paid}
              </div>
              <p className="text-xs text-muted-foreground">
                Fully paid orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partial Payments</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.payments.partial}
              </div>
              <p className="text-xs text-muted-foreground">
                Partially paid orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid Orders</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics.payments.unpaid}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Customer Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.customers.total}</div>
              <p className="text-xs text-muted-foreground">
                Registered customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.customers.withOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                Customers with orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Orders/Customer</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.customers.averageOrdersPerCustomer.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per active customer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{analytics.customers.averageLifetimeValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg per customer
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Inventory Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.inventory.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Product types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.inventory.totalStock}
              </div>
              <p className="text-xs text-muted-foreground">
                Cartons available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.inventory.lowStockProducts}
              </div>
              <p className="text-xs text-muted-foreground">
                Need restock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics.inventory.outOfStockProducts}
              </div>
              <p className="text-xs text-muted-foreground">
                Unavailable items
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Invoice Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.invoices.total}</div>
              <p className="text-xs text-muted-foreground">
                Generated invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.invoices.paid}
              </div>
              <p className="text-xs text-muted-foreground">
                Fully settled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.invoices.pending}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics.invoices.overdue}
              </div>
              <p className="text-xs text-muted-foreground">
                Past due date
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Customers */}
      {analytics.topCustomers && analytics.topCustomers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Top Customers</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {analytics.topCustomers.map((customer, index) => (
                  <div key={customer._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.orderCount} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{customer.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Total spent</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products */}
      {analytics.topProducts && analytics.topProducts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {analytics.topProducts.map((product, index) => (
                  <div key={product._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.size.value}{product.size.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{product.totalSold} cartons</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{product.revenue.toFixed(2)} revenue
                      </p>
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
