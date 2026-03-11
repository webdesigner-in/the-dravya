"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Download, Eye, ShoppingCart, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

export default function InvoicesPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [invoices, setInvoices] = useState([]);
  const [allLoadedInvoices, setAllLoadedInvoices] = useState([]); // Cache all loaded invoices
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // New: Loading more invoices
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true); // New: Track if more invoices available
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    status: "",
    paidAmount: "",
    dueDate: "",
    paymentTerms: "",
    notes: "",
    terms: "",
  });
  
  // Pagination state (kept for API compatibility)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasMore: false,
  });

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, searchQuery]); // Removed currentPage dependency

  // Infinite scroll implementation for invoices
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      
      if (isNearBottom && !isLoading && !isLoadingMore && hasMoreInvoices && !searchQuery) {
        loadMoreInvoices();
      }
    };

    let scrollTimeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledScroll);
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isLoading, isLoadingMore, hasMoreInvoices, searchQuery]);

  // Load more invoices function
  const loadMoreInvoices = async () => {
    if (isLoadingMore || !hasMoreInvoices) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = Math.floor(allLoadedInvoices.length / 20) + 1;
      let url = "/api/invoices?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      url += `page=${nextPage}&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const newInvoices = data.invoices || [];
        
        if (newInvoices.length === 0) {
          setHasMoreInvoices(false);
        } else {
          setAllLoadedInvoices(prev => [...prev, ...newInvoices]);
          setInvoices(prev => [...prev, ...newInvoices]);
          
          if (data.pagination) {
            setPagination(data.pagination);
            setHasMoreInvoices(data.pagination.hasMore);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load more invoices:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      let url = "/api/invoices?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      url += `page=1&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const invoicesData = data.invoices || [];
        
        setInvoices(invoicesData);
        setAllLoadedInvoices(invoicesData);
        
        if (data.pagination) {
          setPagination(data.pagination);
          setHasMoreInvoices(data.pagination.hasMore);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    setHasMoreInvoices(true); // Reset infinite scroll state
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

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setEditFormData({
      status: invoice.status,
      paidAmount: invoice.paidAmount.toString(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
      paymentTerms: invoice.paymentTerms || "",
      notes: invoice.notes || "",
      terms: invoice.terms || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update invoice");
      }

      toast.success("Invoice updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete invoice");
      }

      toast.success("Invoice deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      toast.error(error.message);
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
    }
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
              <Input
                placeholder="Search by invoice number, order number, or customer name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="text-sm"
              />
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
            {invoices.length > 0 ? (
              <>
                Showing {invoices.length} invoice(s)
                {hasMoreInvoices && !searchQuery && (
                  <span className="text-muted-foreground"> • Scroll down to load more</span>
                )}
              </>
            ) : (
              "Your invoices will appear here"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {isLoading && invoices.length === 0 ? (
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
            <>
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
                          {invoice.customer ? (
                            <p className="font-medium truncate">{invoice.customer.name}</p>
                          ) : invoice.guestInfo ? (
                            <p className="font-medium truncate">{invoice.guestInfo.name} <span className="text-xs text-muted-foreground">(Guest)</span></p>
                          ) : (
                            <p className="font-medium truncate text-muted-foreground">N/A</p>
                          )}
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
                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <span>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</span>
                        {invoice.paymentTerms && (
                          <span className="ml-4">Terms: {invoice.paymentTerms}</span>
                        )}
                      </div>

                      {/* Action Buttons - Compact Layout */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => router.push(`/dashboard/invoices/${invoice._id}`)}
                          className="text-xs h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
                            toast.success("Opening invoice PDF...");
                          }}
                          className="text-xs h-8"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                        {invoice.order?._id && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/dashboard/orders?search=${invoice.order.orderNumber}`)}
                            className="text-xs h-8"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Order
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(invoice)}
                              className="text-xs h-8"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteClick(invoice)}
                              className="text-xs h-8"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
              
              {/* Infinite Scroll Loading Indicator */}
              {isLoadingMore && (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <p className="text-sm text-muted-foreground">Loading more invoices...</p>
                </div>
              )}
              
              {/* End of Results Indicator */}
              {!hasMoreInvoices && invoices.length > 0 && !searchQuery && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    You've reached the end of all invoices
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details for {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount (₹)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  value={editFormData.paidAmount}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, paidAmount: e.target.value })
                  }
                  min="0"
                  max={selectedInvoice?.totalAmount}
                  step="0.01"
                />
                {selectedInvoice && (
                  <p className="text-xs text-muted-foreground">
                    Total: ₹{parseFloat(selectedInvoice.totalAmount).toFixed(2)} | 
                    Balance: ₹{(parseFloat(selectedInvoice.totalAmount) - parseFloat(editFormData.paidAmount || 0)).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, dueDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={editFormData.paymentTerms}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, paymentTerms: e.target.value })
                  }
                  placeholder="e.g., Due on receipt"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editFormData.notes}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, notes: e.target.value })
                }
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={editFormData.terms}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, terms: e.target.value })
                }
                placeholder="Terms and conditions"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {selectedInvoice?.invoiceNumber}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
