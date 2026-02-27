"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Bell,
  Calendar,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isLowStockDialogOpen, setIsLowStockDialogOpen] = useState(false);
  const [isOverdueDialogOpen, setIsOverdueDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  const todayStats = [
    {
      title: "Today's Revenue",
      value: `₹${dashboardData.today.revenue.toFixed(2)}`,
      subtitle: `${dashboardData.today.orders} orders`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Orders",
      value: dashboardData.summary.pendingOrders,
      subtitle: "Need attention",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Low Stock Items",
      value: dashboardData.summary.lowStockProducts,
      subtitle: "Need restock",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Overdue Payments",
      value: dashboardData.overduePayments.count,
      subtitle: `₹${dashboardData.overduePayments.amount.toFixed(2)} due`,
      icon: Bell,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name || "User"}! Here's what needs your attention.
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/analytics" className="shrink-0">
            <Button variant="outline" className="w-full sm:w-auto">
              View Analytics
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {todayStats.map((stat, index) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-8 text-xs"
                onClick={() => {
                  if (index === 0) setIsRevenueDialogOpen(true);
                  else if (index === 1) setIsPendingDialogOpen(true);
                  else if (index === 2) setIsLowStockDialogOpen(true);
                  else if (index === 3) setIsOverdueDialogOpen(true);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Required Section */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Pending Orders - Action Required */}
        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Orders
                </CardTitle>
                <CardDescription className="mt-1">Orders waiting for processing</CardDescription>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 shrink-0">
                {dashboardData.pendingOrdersList.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.pendingOrdersList.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All orders are processed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.pendingOrdersList.slice(0, 5).map((order) => (
                  <Link
                    key={order._id}
                    href={`/dashboard/orders`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-yellow-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{order.customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.orderNumber} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{order.finalAmount.toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                        {order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {dashboardData.pendingOrdersList.length > 5 && (
                  <Link href="/dashboard/orders">
                    <Button variant="outline" className="w-full">
                      View All {dashboardData.pendingOrdersList.length} Pending Orders
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert - Action Required */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>Products need immediate restocking</CardDescription>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {dashboardData.lowStockProducts.length} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.lowStockProducts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All products are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.lowStockProducts.map((product) => (
                  <Link
                    key={product._id}
                    href="/dashboard/products"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.size.value}{product.size.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-red-600">
                        {product.stock} cartons
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min: {product.minStockLevel}
                      </p>
                    </div>
                  </Link>
                ))}
                <Link href="/dashboard/stock">
                  <Button variant="outline" className="w-full">
                    Manage Stock
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments */}
      {dashboardData.overduePayments.list.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Overdue Payments
                </CardTitle>
                <CardDescription>
                  ₹{dashboardData.overduePayments.amount.toFixed(2)} pending collection
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {dashboardData.overduePayments.count} customers
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.overduePayments.list.slice(0, 5).map((payment) => (
                <Link
                  key={payment.orderId}
                  href={`/dashboard/orders?customer=${payment.customerId}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{payment.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      Order: {payment.orderNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-orange-600">
                      ₹{payment.dueAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))} days overdue
                    </p>
                  </div>
                </Link>
              ))}
              {dashboardData.overduePayments.list.length > 5 && (
                <Link href="/dashboard/reports">
                  <Button variant="outline" className="w-full">
                    View All Overdue Payments
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Orders
                </CardTitle>
                <CardDescription>Orders placed today</CardDescription>
              </div>
              <Badge variant="outline">{dashboardData.today.orders} orders</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.todayOrders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No orders today yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.todayOrders.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{order.customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.orderNumber} • {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{order.finalAmount.toFixed(2)}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Recent Deliveries
                </CardTitle>
                <CardDescription>Successfully delivered orders</CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {dashboardData.recentDeliveries.length} delivered
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.recentDeliveries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent deliveries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentDeliveries.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{order.customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.orderNumber} • {new Date(order.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-green-600">
                        ₹{order.finalAmount.toFixed(2)}
                      </p>
                      <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/orders"
              className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-primary/5 hover:border-primary transition-colors"
            >
              <ShoppingCart className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">New Order</span>
            </Link>
            <Link
              href="/dashboard/customers"
              className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-primary/5 hover:border-primary transition-colors"
            >
              <Users className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Add Customer</span>
            </Link>
            <Link
              href="/dashboard/stock"
              className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-primary/5 hover:border-primary transition-colors"
            >
              <Package className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">Stock In</span>
            </Link>
            <Link
              href="/dashboard/reports"
              className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-primary/5 hover:border-primary transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium">View Reports</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Details Dialog */}
      <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Today's Revenue Breakdown</DialogTitle>
            <DialogDescription>
              Detailed breakdown of today's revenue from {dashboardData.today.orders} orders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{dashboardData.today.revenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{dashboardData.today.orders}</p>
              </div>
            </div>
            
            {dashboardData.todayOrders.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-semibold">Today's Orders</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Order #</th>
                        <th className="text-left p-2">Customer</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dashboardData.todayOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{order.orderNumber}</td>
                          <td className="p-2">{order.customer.name}</td>
                          <td className="p-2 text-right font-semibold">₹{order.finalAmount.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-xs capitalize">
                              {order.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No orders today</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Orders Dialog */}
      <Dialog open={isPendingDialogOpen} onOpenChange={setIsPendingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pending Orders</DialogTitle>
            <DialogDescription>
              {dashboardData.pendingOrdersList.length} orders waiting for processing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {dashboardData.pendingOrdersList.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Order #</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-center p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboardData.pendingOrdersList.map((order) => (
                      <tr key={order._id} className="hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">{order.orderNumber}</td>
                        <td className="p-2">{order.customer.name}</td>
                        <td className="p-2 text-right font-semibold">₹{order.finalAmount.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Link href="/dashboard/orders">
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No pending orders</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Low Stock Dialog */}
      <Dialog open={isLowStockDialogOpen} onOpenChange={setIsLowStockDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Low Stock Alert</DialogTitle>
            <DialogDescription>
              {dashboardData.lowStockProducts.length} products need restocking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {dashboardData.lowStockProducts.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Product</th>
                      <th className="text-center p-2">Current Stock</th>
                      <th className="text-center p-2">Min Level</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-center p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboardData.lowStockProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.size.value}{product.size.unit}
                            </p>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-semibold text-red-600">{product.stock}</span>
                        </td>
                        <td className="p-2 text-center">{product.minStockLevel}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-800">
                            Low Stock
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Link href="/dashboard/stock">
                            <Button variant="ghost" size="sm">Restock</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">All products are well stocked</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Overdue Payments Dialog */}
      <Dialog open={isOverdueDialogOpen} onOpenChange={setIsOverdueDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Overdue Payments</DialogTitle>
            <DialogDescription>
              {dashboardData.overduePayments.count} customers with ₹{dashboardData.overduePayments.amount.toFixed(2)} overdue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {dashboardData.overduePayments.list.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Order #</th>
                      <th className="text-right p-2">Due Amount</th>
                      <th className="text-center p-2">Days Overdue</th>
                      <th className="text-center p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboardData.overduePayments.list.map((payment) => (
                      <tr key={payment.orderId} className="hover:bg-muted/50">
                        <td className="p-2">{payment.customerName}</td>
                        <td className="p-2 font-mono text-xs">{payment.orderNumber}</td>
                        <td className="p-2 text-right font-semibold text-orange-600">
                          ₹{payment.dueAmount.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                            {Math.floor((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))} days
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Link href={`/dashboard/orders?customer=${payment.customerId}`}>
                            <Button variant="ghost" size="sm">View Orders</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No overdue payments</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
