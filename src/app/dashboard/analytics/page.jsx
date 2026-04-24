"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  IndianRupee, TrendingUp, TrendingDown, ShoppingCart,
  Users, Package, FileText, AlertCircle, CheckCircle,
  Clock, BarChart3, Calendar,
} from "lucide-react";
import { toast } from "sonner";

const fmt  = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtK = (v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

const StatCard = ({ title, value, sub, icon: Icon, color = "text-foreground" }) => (
  <Card>
    <CardHeader className="pb-2 px-4 pt-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className={`h-3.5 w-3.5 ${color}`} />}
      </div>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

export default function AnalyticsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [selectedMonth, setSelectedMonth] = useState("all");

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

  const { data: analytics, isLoading, error } = useAnalytics(selectedMonth);

  useEffect(() => {
    if (!isAdmin) { router.push("/dashboard"); toast.error("Access denied."); }
  }, [isAdmin, router]);

  useEffect(() => { if (error) toast.error("Failed to fetch analytics"); }, [error]);

  if (!isAdmin) return null;

  const header = (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">Business insights and trends</p>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-45"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (!analytics?.analytics) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex justify-center items-center py-20">
          {isLoading
            ? <div className="flex flex-col items-center gap-3"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /><p className="text-sm text-muted-foreground">Loading analytics...</p></div>
            : <p className="text-muted-foreground">No analytics data available</p>}
        </div>
      </div>
    );
  }

  const d       = analytics.analytics;
  const monthly = analytics.monthly || [];

  return (
    <div className="space-y-6">
      {header}

      {isLoading && (
        <div className="flex justify-center py-1">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
            <span className="text-xs text-muted-foreground">Updating...</span>
          </div>
        </div>
      )}

      {/* ── KPI summary row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Revenue"    value={fmt(d.revenue.total)}        sub={`${d.revenue.orderCount} orders`}                     icon={IndianRupee} />
        <StatCard title="Collected"        value={fmt(d.revenue.collected)}    sub={`${d.revenue.collectionRate.toFixed(1)}% rate`}        icon={TrendingUp}  color="text-green-600" />
        <StatCard title="Outstanding"      value={fmt(d.revenue.outstanding)}  sub="Pending collection"                                    icon={TrendingDown} color="text-red-600" />
        <StatCard title="Avg Order Value"  value={fmt(d.revenue.averageOrderValue)} sub="Per order"                                        icon={BarChart3} />
      </div>

      {/* ── Revenue trend line chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Revenue Trend</CardTitle>
          <CardDescription className="text-xs">
            {selectedMonth === 'all' ? 'Last 12 months' : `Daily breakdown for ${monthOptions.find(m => m.value === selectedMonth)?.label}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={monthly.length > 15 ? Math.floor(monthly.length / 10) : 0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue"     stroke="#2563eb" strokeWidth={2} dot={monthly.length <= 12 ? { r: 4 } : false} name="Revenue" />
              <Line type="monotone" dataKey="collected"   stroke="#16a34a" strokeWidth={2} dot={monthly.length <= 12 ? { r: 4 } : false} name="Collected" />
              <Line type="monotone" dataKey="outstanding" stroke="#dc2626" strokeWidth={2} dot={monthly.length <= 12 ? { r: 4 } : false} name="Outstanding" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Orders trend line chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Orders Trend</CardTitle>
          <CardDescription className="text-xs">
            {selectedMonth === 'all' ? 'Last 12 months' : `Daily breakdown for ${monthOptions.find(m => m.value === selectedMonth)?.label}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={monthly.length > 15 ? Math.floor(monthly.length / 10) : 0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#666" />
              <Line type="monotone" dataKey="orders"    stroke="#2563eb" strokeWidth={2} dot={monthly.length <= 12 ? { r: 4 } : false} name="Total Orders" />
              <Line type="monotone" dataKey="delivered" stroke="#16a34a" strokeWidth={2} dot={monthly.length <= 12 ? { r: 4 } : false} name="Delivered" />
              <Line type="monotone" dataKey="cancelled" stroke="#dc2626" strokeWidth={2} dot={monthly.length <= 12 ? { r: 4 } : false} name="Cancelled" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Top customers line chart ── */}
      {d.topCustomers?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Customers by Revenue</CardTitle>
            <CardDescription className="text-xs">Highest spending customers this period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={d.topCustomers.map((c, i) => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name, revenue: c.totalSpent, orders: c.orderCount, rank: i + 1 }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v, name) => name === 'Revenue' ? fmt(v) : v} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={{ r: 5 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Top products line chart ── */}
      {d.topProducts?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Products — Cartons Sold</CardTitle>
            <CardDescription className="text-xs">Best selling products this period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={d.topProducts.map(p => ({ name: `${p.name} ${p.size?.value}${p.size?.unit}`, cartons: p.totalSold, revenue: p.revenue }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="cartons" stroke="#0891b2" strokeWidth={2} dot={{ r: 5 }} name="Cartons Sold" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Bottom KPI grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Orders"      value={d.orders.total}                                  sub={`${d.orders.deliveryRate.toFixed(1)}% delivered`}   icon={ShoppingCart} />
        <StatCard title="Delivered"         value={d.orders.delivered}                              sub="Completed orders"                                   icon={CheckCircle}  color="text-green-600" />
        <StatCard title="Pending"           value={d.orders.pending}                                sub="Awaiting processing"                                icon={Clock}        color="text-yellow-600" />
        <StatCard title="Cancelled"         value={d.orders.cancelled}                              sub={`${d.orders.cancellationRate.toFixed(1)}% rate`}    icon={AlertCircle}  color="text-red-600" />
        <StatCard title="Paid Orders"       value={d.payments.paid}                                 sub="Fully paid"                                         icon={CheckCircle}  color="text-green-600" />
        <StatCard title="Partial Payments"  value={d.payments.partial}                              sub="Partially paid"                                     icon={Clock}        color="text-yellow-600" />
        <StatCard title="Unpaid Orders"     value={d.payments.unpaid}                               sub="Awaiting payment"                                   icon={AlertCircle}  color="text-red-600" />
        <StatCard title="Overdue Invoices"  value={d.invoices.overdue}                              sub={`${d.invoices.total} total invoices`}               icon={FileText}     color="text-red-600" />
        <StatCard title="Total Customers"   value={d.customers.total}                               sub={`${d.customers.withOrders} active`}                 icon={Users} />
        <StatCard title="Avg Orders/Customer" value={d.customers.averageOrdersPerCustomer.toFixed(1)} sub="Per active customer"                             icon={BarChart3} />
        <StatCard title="Total Stock"       value={`${d.inventory.totalStock} cartons`}             sub={`${d.inventory.totalProducts} products`}            icon={Package}      color="text-green-600" />
        <StatCard title="Low / Out of Stock" value={`${d.inventory.lowStockProducts} / ${d.inventory.outOfStockProducts}`} sub="Low · Out of stock"         icon={AlertCircle}  color="text-orange-600" />
      </div>
    </div>
  );
}
