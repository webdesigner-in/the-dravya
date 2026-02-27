"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Search, FileText, Download, Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
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
    fetchInvoices();
  }, [statusFilter, currentPage]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      let url = "/api/invoices?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      url += `page=${currentPage}&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchInvoices();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      partial: "bg-yellow-100 text-yellow-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <PageHeader
        title="Invoices"
        description="Manage and track all invoices"
        backHref="/dashboard"
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="text-sm"
                />
                <Button onClick={handleSearch} size="icon" className="shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Invoices</CardTitle>
          <CardDescription className="text-sm">
            Showing {pagination.totalItems} invoice(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">No invoices found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create invoices from orders
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice._id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col gap-4">
                      {/* Invoice Header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base md:text-lg font-semibold">
                          {invoice.invoiceNumber}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </div>

                      {/* Invoice Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground block">Customer:</span>
                          <p className="font-medium truncate">{invoice.customer?.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Order:</span>
                          <p className="font-medium">{invoice.order?.orderNumber}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Total:</span>
                          <p className="font-medium">₹{parseFloat(invoice.totalAmount).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Balance:</span>
                          <p className={`font-medium ${invoice.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{parseFloat(invoice.balanceAmount).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Due Date:</span>
                          <p className="font-medium">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <span>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</span>
                        {invoice.paymentTerms && (
                          <span className="ml-4">Terms: {invoice.paymentTerms}</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => router.push(`/dashboard/invoices/${invoice._id}`)}
                          className="w-full text-xs sm:text-sm h-9"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          View Invoice
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
                            toast.success("Opening invoice PDF...");
                          }}
                          className="w-full text-xs sm:text-sm h-9"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Download
                        </Button>
                        {invoice.order?._id && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/dashboard/orders?search=${invoice.order.orderNumber}`)}
                            className="w-full text-xs sm:text-sm h-9 col-span-2 sm:col-span-1"
                          >
                            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            View Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && invoices.length > 0 && (
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
