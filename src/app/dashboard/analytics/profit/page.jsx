"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/layout/PageHeader";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, IndianRupee, Package } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

const fmt = (n) => `₹${parseFloat(n || 0).toFixed(0)}`;
const fmtPct = (n) => `${parseFloat(n || 0).toFixed(1)}%`;

export default function ProfitAnalysisPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [months, setMonths] = useState("6");

  const { data, isLoading } = useQuery({
    queryKey: ["profit-analysis", months],
    queryFn: () => api.get("/api/analytics/profit", { params: { months } }),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  const monthly  = data?.monthly  || [];
  const products = data?.products || [];

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalCost    = monthly.reduce((s, m) => s + m.cost,    0);
  const totalProfit  = monthly.reduce((s, m) => s + m.profit,  0);
  const avgMargin    = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Analysis"
        description="Revenue, cost, and margin trends over time"
        backHref="/dashboard/analytics"
        actions={
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Today</SelectItem>
              <SelectItem value="1">This month</SelectItem>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Revenue",  value: fmt(totalRevenue), icon: IndianRupee, color: "text-blue-600" },
              { label: "Total Cost",     value: fmt(totalCost),    icon: TrendingDown, color: "text-red-600" },
              { label: "Total Profit",   value: fmt(totalProfit),  icon: TrendingUp,   color: totalProfit >= 0 ? "text-green-600" : "text-red-600" },
              { label: "Avg Margin",     value: fmtPct(avgMargin), icon: Package,      color: avgMargin >= 20 ? "text-green-600" : "text-orange-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Last {months} months</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue vs Cost vs Profit line chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue · Cost · Profit</CardTitle>
              <CardDescription>
                {months === "0" ? "Today" : months === "1" ? "Daily — this month" : `Monthly — last ${months} months`} · all amounts in ₹
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={monthly.length > 15 ? Math.floor(monthly.length / 10) : 0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v, name) => [`₹${v.toLocaleString('en-IN')}`, name]} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={monthly.length <= 15 ? { r: 4 } : false} name="Revenue" />
                  <Line type="monotone" dataKey="cost"    stroke="#dc2626" strokeWidth={2} dot={monthly.length <= 15 ? { r: 4 } : false} name="Cost" />
                  <Line type="monotone" dataKey="profit"  stroke="#16a34a" strokeWidth={2} dot={monthly.length <= 15 ? { r: 4 } : false} name="Profit" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit margin % line chart */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin %</CardTitle>
              <CardDescription>
                {months === "0" ? "Today" : months === "1" ? "Daily — this month" : `Monthly — last ${months} months`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={monthly.length > 15 ? Math.floor(monthly.length / 10) : 0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v) => [`${v}%`, "Margin"]} />
                  <ReferenceLine y={0}  stroke="#dc2626" strokeDasharray="3 3" label={{ value: "0%",  position: "right", fontSize: 10 }} />
                  <ReferenceLine y={20} stroke="#16a34a" strokeDasharray="3 3" label={{ value: "20%", position: "right", fontSize: 10 }} />
                  <Line type="monotone" dataKey="margin" stroke="#7c3aed" strokeWidth={2} dot={monthly.length <= 15 ? { r: 4 } : false} name="Margin %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-product price trend charts */}
          <div>
            <h2 className="text-base font-semibold mb-3">Product Price Trends</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Selling price = average price charged to customers that month. Cost price = your purchase cost at that time.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {products.map((product, idx) => {
                // Only show products that have at least one month with sales
                const hasSales = product.trend.some(t => t.cartonsSold > 0);
                if (!hasSales) return null;

                const color = COLORS[idx % COLORS.length];

                return (
                  <Card key={product.productId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {product.name}
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          {product.size?.value}{product.size?.unit}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Current: Cost ₹{product.currentCost} · Sell ₹{product.currentSell} · Margin ₹{(product.currentSell - product.currentCost).toFixed(0)}/carton
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={product.trend} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} domain={['auto', 'auto']} />
                          <Tooltip
                            formatter={(v, name) => v !== null ? [`₹${v}`, name] : ['No sales', name]}
                          />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                          <Line
                            type="monotone"
                            dataKey="avgSellPrice"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name="Avg Actual Sell"
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="catalogPrice"
                            stroke={color}
                            strokeWidth={1.5}
                            strokeDasharray="6 3"
                            dot={{ r: 2 }}
                            name="Catalog (Max) Price"
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="costPrice"
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={{ r: 2 }}
                            name="Cost Price"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      {/* Monthly cartons sold */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.trend.map(t => t.cartonsSold > 0 && (
                          <span key={t.label} className="text-[10px] text-muted-foreground">
                            {t.label}: {t.cartonsSold} cartons
                            {t.margin !== null && ` · ${t.margin}% margin`}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Monthly table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 px-2">Month</th>
                      <th className="pb-2 px-2 text-right">Orders</th>
                      <th className="pb-2 px-2 text-right">Cartons</th>
                      <th className="pb-2 px-2 text-right">Revenue</th>
                      <th className="pb-2 px-2 text-right">Cost</th>
                      <th className="pb-2 px-2 text-right">Profit</th>
                      <th className="pb-2 px-2 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthly.map((m) => (
                      <tr key={m.label} className="hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">{m.label}</td>
                        <td className="py-2 px-2 text-right">{m.orders}</td>
                        <td className="py-2 px-2 text-right">{m.cartons}</td>
                        <td className="py-2 px-2 text-right text-blue-600">₹{m.revenue.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-red-600">₹{m.cost.toLocaleString('en-IN')}</td>
                        <td className={`py-2 px-2 text-right font-semibold ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{m.profit.toLocaleString('en-IN')}
                        </td>
                        <td className={`py-2 px-2 text-right ${m.margin >= 20 ? 'text-green-600' : 'text-orange-600'}`}>
                          {m.margin}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-semibold">
                    <tr>
                      <td className="py-2 px-2">Total</td>
                      <td className="py-2 px-2 text-right">{monthly.reduce((s, m) => s + m.orders, 0)}</td>
                      <td className="py-2 px-2 text-right">{monthly.reduce((s, m) => s + m.cartons, 0)}</td>
                      <td className="py-2 px-2 text-right text-blue-600">₹{totalRevenue.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-right text-red-600">₹{totalCost.toLocaleString('en-IN')}</td>
                      <td className={`py-2 px-2 text-right ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{totalProfit.toLocaleString('en-IN')}
                      </td>
                      <td className={`py-2 px-2 text-right ${avgMargin >= 20 ? 'text-green-600' : 'text-orange-600'}`}>
                        {avgMargin.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
