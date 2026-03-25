"use client";

import React, { useState, useEffect, useRef } from "react";
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
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Trash2,
  Search,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { useAuthStore } from "@/store/authStore";
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from "@/hooks/useTransactions";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";

export default function TransactionsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasShownAccessDenied = useRef(false);
  
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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
  
  // React Query hooks with infinite scroll
  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useTransactions({ 
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined,
    month: selectedMonth
  });
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  
  // Fetch customers and orders for dropdowns
  const { data: customersData } = useCustomers({});
  const { data: ordersData } = useOrders({});
  
  // Flatten all pages
  const transactions = data?.pages?.flatMap(page => page.transactions) || [];
  const summary = data?.pages?.[0]?.summary || { totalIncome: 0, totalExpense: 0, netProfit: 0 };
  const customers = customersData?.pages?.flatMap(page => page.customers) || [];
  const orders = ordersData?.pages?.flatMap(page => page.orders) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

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
    if (!isAdmin && !hasShownAccessDenied.current) {
      hasShownAccessDenied.current = true;
      router.push("/dashboard");
      toast.error("Access denied. Transactions are only accessible to administrators.");
    }
  }, [isAdmin, router]);

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      
      if (isNearBottom && !isLoading && !isFetchingNextPage && hasNextPage && !searchQuery) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, isFetchingNextPage, hasNextPage, searchQuery, fetchNextPage]);

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
      await deleteTransaction.mutateAsync(transactionToDelete._id);
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      // Error toast shown automatically
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingTransaction) {
        await updateTransaction.mutateAsync({
          transactionId: editingTransaction._id,
          updates: formData,
        });
      } else {
        await createTransaction.mutateAsync(formData);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error toast shown automatically
    }
  };

  const getCategoryOptions = () => {
    if (formData.type === "income") {
      return ["sale", "other"];
    }
    return ["purchase", "salary", "fuel", "maintenance", "rent", "utility", "transport", "other"];
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
          <div className="flex items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
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
                <Button 
                  type="submit" 
                  disabled={createTransaction.isPending || updateTransaction.isPending} 
                  className="w-full sm:w-auto"
                >
                  {createTransaction.isPending || updateTransaction.isPending
                    ? (editingTransaction ? "Updating..." : "Creating...")
                    : (editingTransaction ? "Update Transaction" : "Create Transaction")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Income</CardTitle>
                <ArrowUpCircle className="h-3.5 w-3.5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-green-600">
                ₹{summary.totalIncome.toFixed(2)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Expense</CardTitle>
                <ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-red-600">
                ₹{summary.totalExpense.toFixed(2)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle>
                <IndianRupee className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className={`text-xl font-bold ${
                  summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ₹{summary.netProfit.toFixed(2)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMonth === "all" ? "All time" : monthOptions.find(m => m.value === selectedMonth)?.label}
              </p>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by description, order number, customer name, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(searchQuery || typeFilter !== "all" || categoryFilter !== "all" || selectedMonth !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setCategoryFilter("all");
                  setSelectedMonth("all");
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
            {transactions.length > 0 ? `Showing ${transactions.length} transaction(s)` : "Your transactions will appear here"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load transactions</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <IndianRupee className="mx-auto h-12 w-12 text-gray-400" />
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
            
            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading more transactions...</span>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasNextPage && !searchQuery && transactions.length > 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No more transactions to load</p>
              </div>
            )}
            </div>
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
              disabled={deleteTransaction.isPending}
            >
              {deleteTransaction.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
