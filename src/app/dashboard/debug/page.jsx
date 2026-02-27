"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/layout/PageHeader";
import { RefreshCw, Users, ShoppingCart, DollarSign } from "lucide-react";

export default function DebugPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [debugData, setDebugData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    fetchDebugData();
  }, [isAdmin, router]);

  const fetchDebugData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/debug/all-users");
      if (response.ok) {
        const data = await response.json();
        setDebugData(data);
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debug Information"
        description="System-wide data overview for troubleshooting"
        actions={
          <Button onClick={fetchDebugData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {debugData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debugData.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{debugData.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current User</CardTitle>
                <Badge variant="default">{debugData.currentUser.role}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users & Their Orders</CardTitle>
              <CardDescription>
                This shows all users in the database and how many orders each has created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Orders</th>
                      <th className="text-right p-3 font-medium">Revenue</th>
                      <th className="text-left p-3 font-medium">User ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugData.users.map((user) => (
                      <tr
                        key={user._id}
                        className={`border-b hover:bg-gray-50 ${
                          user._id === debugData.currentUser.userId ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {user.name}
                            {user._id === debugData.currentUser.userId && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-3">
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">{user.orderCount}</td>
                        <td className="p-3 text-right font-medium">
                          ₹{user.totalRevenue.toFixed(2)}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">
                          {user._id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Understanding the Data</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Admin users</strong> see ALL orders from ALL users in the dashboard and
                orders page.
              </p>
              <p>
                <strong>Distributor users</strong> see only their own orders (filtered by their
                User ID).
              </p>
              <p>
                If you're seeing different revenue on localhost vs Vercel, check if you're logged
                in as different users (different User IDs) in each environment.
              </p>
              <p className="pt-2 border-t border-blue-200">
                <strong>Current User ID:</strong>{" "}
                <code className="bg-blue-100 px-2 py-1 rounded">
                  {debugData.currentUser.userId}
                </code>
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
