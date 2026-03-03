"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default function ReportsPage() {
  const [customerLedger, setCustomerLedger] = useState([]);
  const [filteredLedger, setFilteredLedger] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalDue: 0,
    totalCustomers: 0,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasMore: false,
  });

  useEffect(() => {
    fetchCustomerLedger();
  }, [currentPage]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLedger(customerLedger);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customerLedger.filter(
        (ledger) =>
          ledger.customer?.name?.toLowerCase().includes(query) ||
          ledger.customer?.phone?.includes(query)
      );
      setFilteredLedger(filtered);
    }
  }, [searchQuery, customerLedger]);

  const fetchCustomerLedger = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/reports/customer-ledger?page=${currentPage}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setCustomerLedger(data.ledger || []);
        setFilteredLedger(data.ledger || []);
        setIsAdmin(data.isAdmin || false);
        
        // Only set summary if provided (admin only)
        if (data.summary) {
          setSummary(data.summary);
        }
        
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        toast.error("Failed to fetch customer ledger");
      }
    } catch (error) {
      toast.error("Failed to fetch customer ledger");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSearchQuery(""); // Clear search when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                  {filteredLedger.map((ledger) => (
                    <tr key={ledger.customer._id} className="hover:bg-muted/50">
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
                        <Link href={`/dashboard/orders?customer=${ledger.customer._id}`}>
                          <Button variant="outline" size="sm">
                            View Orders
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && !searchQuery && filteredLedger.length > 0 && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
