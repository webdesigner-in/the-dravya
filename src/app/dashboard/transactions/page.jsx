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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAuthStore } from "@/store/authStore";

export default function TransactionsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasMore: false,
  });

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    type: "income",
    category: "sale",
    amount: "",
    paymentMethod: "cash",
    paymentStatus: "completed",
    order: "",
    customer: "",
    description: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      toast.error("Access denied. Transactions are only accessible to administrators.");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions();
      fetchCustomers();
      fetchOrders();
    }
  }, [typeFilter, categoryFilter, dateFilter, searchQuery, currentPage, isAdmin]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      let url = "/api/transactions?";
      if (typeFilter !== "all") url += `type=${typeFilter}&`;
      if (categoryFilter !== "all") url += `category=${categoryFilter}&`;
      if (dateFilter !== "all") url += `date=${dateFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      url += `page=${currentPage}&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || { totalIncome: 0, totalExpense: 0, netProfit: 0 });
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers");
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders");
    }
  };

  const resetForm = () => {
    setFormData({
      type: "income",
      category: "sale",
      amount: "",
      paymentMethod: "cash",
      paymentStatus: "completed",
      order: "",
      customer: "",
      description: "",
      reference: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setEditingTransaction(null);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      order: transaction.order?._id || "",
      customer: transaction.customer?._id || "",
      description: transaction.description,
      reference: transaction.reference || "",
      date: new Date(transaction.date).toISOString().split("T")[0],
      notes: transaction.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const response = await fetch(`/api/transactions/${transactionToDelete._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete transaction");
      }

      toast.success("Transaction deleted successfully!");
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
      fetchTransactions();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingTransaction
        ? `/api/transactions/${editingTransaction._id}`
        : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingTransaction ? 'update' : 'create'} transaction`);
      }

      toast.success(`Transaction ${editingTransaction ? 'updated' : 'created'} successfully!`);
      resetForm();
      setIsDialogOpen(false);
      fetchTransactions();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryOptions = () => {
    if (formData.type === "income") {
      return ["sale", "other"];
    }
    return ["purchase", "salary", "fuel", "maintenance", "rent", "utility", "other"];
  };

  // Prevent rendering for non-admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Track income and expenses"
        backHref="/dashboard"
        actions={
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Update transaction details' : 'Record a new income or expense'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Type, Category, Amount, Date - 4 columns on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          type: value,
                          category: value === "income" ? "sale" : "purchase",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoryOptions().map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Payment Method and Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm">Payment Method *</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus" className="text-sm">Payment Status</Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentStatus: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Customer and Order (only for income) */}
                {formData.type === "income" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer" className="text-sm">Customer</Label>
                      <Select
                        value={formData.customer}
                        onValueChange={(value) =>
                          setFormData({ ...formData, customer: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.filter(c => c._id).map((customer) => (
                            <SelectItem key={customer._id} value={customer._id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order" className="text-sm">Order</Label>
                      <Select
                        value={formData.order}
                        onValueChange={(value) =>
                          setFormData({ ...formData, order: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select order" />
                        </SelectTrigger>
                        <SelectContent>
                          {orders.filter(o => o._id).map((order) => (
                            <SelectItem key={order._id} value={order._id}>
                              {order.orderNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Description and Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">Description *</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Brief description"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference" className="text-sm">Reference Number</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) =>
                        setFormData({ ...formData, reference: e.target.value })
                      }
                      placeholder="Invoice/Receipt number"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? (editingTransaction ? "Updating..." : "Creating...") : (editingTransaction ? "Update Transaction" : "Create Transaction")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{summary.totalIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{summary.totalExpense.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{summary.netProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by description, order number, customer name, or reference..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={typeFilter} onValueChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(value) => {
                setDateFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Clear Filters Button */}
            {(searchQuery || typeFilter !== "all" || categoryFilter !== "all" || dateFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setCategoryFilter("all");
                  setDateFilter("all");
                  setCurrentPage(1);
                }}
                className="w-full md:w-auto"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Showing {pagination.totalItems} transaction(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-5 w-5 text-green-600 mt-1 shrink-0" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600 mt-1 shrink-0" />
                        )}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">
                              {transaction.transactionNumber}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 capitalize">
                              {transaction.category}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.description}
                          </p>
                          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>
                              {new Date(transaction.date).toLocaleDateString()}
                            </span>
                            <span className="capitalize">
                              {transaction.paymentMethod}
                            </span>
                            {transaction.customer ? (
                              <span>{transaction.customer.name}</span>
                            ) : transaction.order?.orderType === 'guest' && transaction.order?.guestInfo?.name ? (
                              <span>{transaction.order.guestInfo.name} (Guest)</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p
                          className={`text-lg font-bold ${
                            transaction.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}₹
                          {transaction.amount.toFixed(2)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            transaction.paymentStatus === "completed"
                              ? "bg-green-100 text-green-700"
                              : transaction.paymentStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {transaction.paymentStatus}
                        </span>
                        {isAdmin && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(transaction)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && transactions.length > 0 && (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete transaction {transactionToDelete?.transactionNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
