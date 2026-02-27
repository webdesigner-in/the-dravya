"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  Search,
  Filter,
  FileText,
  ShoppingCart,
  X,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get("customer");
  const isAdmin = useAuthStore((state) => state.isAdmin());
  
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isUnpaidDialogOpen, setIsUnpaidDialogOpen] = useState(false);
  const [isViewOrderDialogOpen, setIsViewOrderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [editOrderData, setEditOrderData] = useState({
    items: [],
    notes: "",
    deliveryDate: "",
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

  // Format date helper to avoid hydration issues
  const formatDate = (dateString) => {
    if (!isMounted) return ''; // Return empty during SSR
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    if (typeof window === 'undefined') return 'all'; // Return 'all' during SSR
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  
  const [monthFilter, setMonthFilter] = useState('all');
  
  // Set current month after component mounts
  useEffect(() => {
    setMonthFilter(getCurrentMonth());
  }, []);

  const [formData, setFormData] = useState({
    customer: customerIdFromUrl || "",
    items: [{ product: "", quantity: 1, customPrice: "" }],
    discount: "0",
    tax: "0",
    status: "pending",
    paymentStatus: "unpaid",
    paidAmount: "0",
    paymentMethod: "cash",
    deliveryDate: "",
    notes: "",
  });

  const [invoiceData, setInvoiceData] = useState({
    dueDate: "",
    paymentTerms: "Due on receipt",
    paymentStatus: "unpaid",
    paidAmount: "0",
    notes: "",
    terms: "",
  });

  // Update invoice data when selected order changes
  useEffect(() => {
    if (selectedOrder && isInvoiceDialogOpen) {
      setInvoiceData({
        dueDate: "",
        paymentTerms: selectedOrder.paymentStatus === "paid" ? "Paid in full" : "Due on receipt",
        paymentStatus: selectedOrder.paymentStatus || "unpaid",
        paidAmount: selectedOrder.paidAmount?.toString() || "0",
        notes: selectedOrder.notes || "",
        terms: "",
      });
    }
  }, [selectedOrder, isInvoiceDialogOpen]);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, [statusFilter, paymentFilter, dateFilter, monthFilter, customerIdFromUrl, currentPage, searchQuery, sortBy]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      let url = "/api/orders?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (paymentFilter !== "all") url += `paymentStatus=${paymentFilter}&`;
      if (dateFilter !== "all") url += `date=${dateFilter}&`;
      if (monthFilter && monthFilter !== "all") url += `month=${monthFilter}&`;
      if (customerIdFromUrl) url += `customer=${customerIdFromUrl}&`;
      if (searchQuery) url += `search=${searchQuery}&`;
      if (sortBy) url += `sortBy=${sortBy}&`;
      url += `page=${currentPage}&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const ordersData = data.orders || [];
        
        // Set pagination info
        if (data.pagination) {
          setPagination(data.pagination);
        }
        
        // Fetch all invoices at once
        const invoicesRes = await fetch('/api/invoices');
        let invoicesMap = {};
        
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          const allInvoices = invoicesData.invoices || [];
          
          // Create a map of order ID to invoice
          allInvoices.forEach(invoice => {
            if (invoice.order?._id) {
              invoicesMap[invoice.order._id] = invoice;
            }
          });
        }
        
        // Attach invoice to each order
        const ordersWithInvoices = ordersData.map(order => {
          const invoice = invoicesMap[order._id] || null;
          return {
            ...order,
            invoice
          };
        });
        
        setOrders(ordersWithInvoices);
      }
    } catch (error) {
      toast.error("Failed to fetch orders");
      console.error('Fetch orders error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        
        // If there's a customer filter, find and set the customer name
        if (customerIdFromUrl) {
          const customer = (data.customers || []).find(c => c._id === customerIdFromUrl);
          if (customer) {
            setSelectedCustomerName(customer.name);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch customers");
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products");
    }
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const handleRefresh = () => {
    // If we're on a customer-specific page, redirect to all orders
    if (customerIdFromUrl) {
      window.location.href = "/dashboard/orders";
      return;
    }
    
    // Reset all filters
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
    setMonthFilter(getCurrentMonth());
    setSortBy("date");
    setCurrentPage(1);
    
    // Reload data
    fetchOrders();
    toast.success("Filters reset and data refreshed");
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditOrder = () => {
    setIsEditMode(true);
    setEditOrderData({
      items: selectedOrder.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        customPrice: item.price,
        _id: item._id,
      })),
      notes: selectedOrder.notes || "",
      deliveryDate: selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toISOString().split('T')[0] : "",
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditOrderData({ items: [], notes: "", deliveryDate: "" });
  };

  const handleAddItemToOrder = () => {
    setEditOrderData({
      ...editOrderData,
      items: [...editOrderData.items, { product: "", quantity: 1, customPrice: "" }],
    });
  };

  const handleRemoveItemFromOrder = (index) => {
    const newItems = editOrderData.items.filter((_, i) => i !== index);
    setEditOrderData({ ...editOrderData, items: newItems });
  };

  const handleUpdateOrderItem = (index, field, value) => {
    const newItems = [...editOrderData.items];
    newItems[index][field] = value;
    setEditOrderData({ ...editOrderData, items: newItems });
  };

  const handleSaveOrder = async () => {
    try {
      setIsSubmitting(true);

      // Validate items
      const validItems = editOrderData.items.filter(item => item.product && item.quantity > 0);
      if (validItems.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems,
          notes: editOrderData.notes,
          deliveryDate: editOrderData.deliveryDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update order");
      }

      toast.success("Order updated successfully!");
      setIsEditMode(false);
      setIsViewOrderDialogOpen(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: "", quantity: 1, customPrice: "" }],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateAutoDiscount(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
    
    // Auto-calculate discount when product or custom price changes
    if (field === 'product' || field === 'customPrice' || field === 'quantity') {
      calculateAutoDiscount(newItems);
    }
  };

  const calculateAutoDiscount = (items) => {
    let subtotalAtOriginalPrice = 0;
    let subtotalAtCustomPrice = 0;
    
    items.forEach((item) => {
      const product = products.find((p) => p._id === item.product);
      if (product) {
        const quantity = parseInt(item.quantity) || 0;
        const originalPrice = parseFloat(product.price) || 0;
        const customPrice = item.customPrice && item.customPrice !== "" ? parseFloat(item.customPrice) : originalPrice;
        
        // Calculate subtotal at original price
        subtotalAtOriginalPrice += originalPrice * quantity;
        
        // Calculate subtotal at custom price (or original if no custom price)
        subtotalAtCustomPrice += customPrice * quantity;
      }
    });
    
    // Discount is the difference between original and custom pricing
    const totalDiscount = subtotalAtOriginalPrice - subtotalAtCustomPrice;
    
    setFormData(prev => ({ ...prev, discount: totalDiscount > 0 ? totalDiscount.toFixed(2) : "0" }));
  };

  const calculateTotal = () => {
    let subtotalAtOriginalPrice = 0;
    let subtotalAtCustomPrice = 0;
    
    formData.items.forEach((item) => {
      const product = products.find((p) => p._id === item.product);
      if (product) {
        const quantity = parseInt(item.quantity) || 0;
        const originalPrice = parseFloat(product.price) || 0;
        const customPrice = item.customPrice && item.customPrice !== "" ? parseFloat(item.customPrice) : originalPrice;
        
        subtotalAtOriginalPrice += originalPrice * quantity;
        subtotalAtCustomPrice += customPrice * quantity;
      }
    });
    
    const discount = parseFloat(formData.discount) || 0;
    const tax = parseFloat(formData.tax) || 0;
    
    // Final amount = subtotal at custom prices + tax
    // (discount is already reflected in the difference between original and custom prices)
    return subtotalAtCustomPrice + tax;
  };

  const resetForm = () => {
    setFormData({
      customer: customerIdFromUrl || "",
      items: [{ product: "", quantity: 1, customPrice: "" }],
      discount: "0",
      tax: "0",
      status: "pending",
      paymentStatus: "unpaid",
      paidAmount: "0",
      paymentMethod: "cash",
      deliveryDate: "",
      notes: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      toast.success("Order created successfully!");
      resetForm();
      setIsDialogOpen(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Order status updated!");
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      const response = await fetch(`/api/orders/${orderToDelete._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete order");
      }

      toast.success("Order deleted successfully!");
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const handlePaymentStatusChange = async (order, newStatus) => {
    // If changing to partial or paid, open dialog
    if (newStatus === "partial" || newStatus === "paid") {
      setSelectedOrder(order);
      setPaymentAmount("");
      setIsPaymentDialogOpen(true);
      return;
    }

    // If changing to unpaid, open confirmation dialog
    if (newStatus === "unpaid") {
      setSelectedOrder(order);
      setIsUnpaidDialogOpen(true);
    }
  };

  const handleUnpaidConfirm = async () => {
    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "unpaid", paidAmount: 0 }),
      });

      if (!response.ok) {
        throw new Error("Failed to update payment status");
      }

      toast.success("Payment status reset to unpaid!");
      
      // Update the local orders state immediately for instant UI feedback
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === selectedOrder._id 
            ? { ...order, paymentStatus: "unpaid", paidAmount: 0 }
            : order
        )
      );
      
      setIsUnpaidDialogOpen(false);
      setSelectedOrder(null);
      
      // Refresh orders from server to ensure consistency
      await fetchOrders();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(paymentAmount);
    const totalAmount = parseFloat(selectedOrder.finalAmount);
    const currentPaid = parseFloat(selectedOrder.paidAmount || 0);
    const newTotalPaid = currentPaid + amount;
    const dueAmount = totalAmount - currentPaid;

    // Validation
    if (amount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    if (amount > dueAmount) {
      toast.error(`Payment amount cannot exceed due amount of ₹${dueAmount.toFixed(2)}`);
      return;
    }

    // Determine correct payment status
    let paymentStatus;
    if (newTotalPaid >= totalAmount) {
      paymentStatus = "paid";
    } else if (newTotalPaid > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    const updateData = {
      paymentStatus,
      paidAmount: newTotalPaid
    };

    console.log("Updating order with:", updateData);

    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update payment");
      }

      toast.success(`Payment of ₹${amount.toFixed(2)} recorded! Status: ${paymentStatus}`);
      
      // Update the local orders state immediately for instant UI feedback
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === selectedOrder._id 
            ? { ...order, paymentStatus, paidAmount: newTotalPaid }
            : order
        )
      );
      
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedOrder(null);
      
      // Refresh orders from server to ensure consistency
      await fetchOrders();
    } catch (error) {
      console.error("Payment update error:", error);
      toast.error(error.message);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedOrder) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      toast.success("Invoice created successfully!", {
        action: {
          label: "View Invoice",
          onClick: () => {
            window.location.href = `/dashboard/invoices/${data.invoice._id}`;
          },
        },
      });
      
      setIsInvoiceDialogOpen(false);
      setSelectedOrder(null);
      setInvoiceData({
        dueDate: "",
        paymentTerms: "Due on receipt",
        paymentStatus: "unpaid",
        paidAmount: "0",
        notes: "",
        terms: "",
      });
      
      // Refresh orders to show the new invoice
      await fetchOrders();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-blue-100 text-blue-700",
      processing: "bg-purple-100 text-purple-700",
      "out-for-delivery": "bg-orange-100 text-orange-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      unpaid: "bg-red-100 text-red-700",
      partial: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <PageHeader
        title={customerIdFromUrl && selectedCustomerName ? `Orders - ${selectedCustomerName}` : "Orders"}
        description={customerIdFromUrl ? `Viewing orders for ${selectedCustomerName || "customer"}` : "Manage and track all orders"}
        backHref={customerIdFromUrl ? "/dashboard/customers" : "/dashboard"}
        actions={
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Create New Order</DialogTitle>
              <DialogDescription className="text-sm">
                Add a new order for a customer
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select
                    value={formData.customer}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customer: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Order Items *</Label>
                    <Button type="button" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  {formData.items.map((item, index) => {
                    const selectedProduct = products.find(p => p._id === item.product);
                    return (
                      <div key={index} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs">Product *</Label>
                            <Select
                              value={item.product}
                              onValueChange={(value) =>
                                updateItem(index, "product", value)
                              }
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {products.map((product) => (
                                  <SelectItem key={product._id} value={product._id}>
                                    {product.name} - ₹{product.price} ({product.stock}{" "}
                                    in stock)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label className="text-xs">Qty *</Label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", e.target.value === "" ? "" : parseInt(e.target.value) || 1)
                              }
                              min="1"
                              required
                            />
                          </div>
                          <div className="w-32">
                            <Label className="text-xs">Custom Price (₹)</Label>
                            <Input
                              type="number"
                              placeholder={selectedProduct ? `₹${selectedProduct.price}` : "Price"}
                              value={item.customPrice}
                              onChange={(e) =>
                                updateItem(index, "customPrice", e.target.value)
                              }
                              min="0"
                              step="0.01"
                            />
                          </div>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {selectedProduct && (
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>Original Price: ₹{selectedProduct.price}</span>
                            {item.customPrice && item.customPrice !== "" && (
                              <span className="text-green-600">
                                Discount: ₹{((selectedProduct.price - parseFloat(item.customPrice)) * (parseInt(item.quantity) || 0)).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount" className="text-sm">Discount (₹) - Auto-calculated</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={formData.discount}
                      readOnly
                      className="bg-gray-50"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Discount is calculated from custom prices
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax" className="text-sm">Tax (₹)</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={formData.tax}
                      onChange={(e) =>
                        setFormData({ ...formData, tax: e.target.value })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  {(() => {
                    let subtotalOriginal = 0;
                    let subtotalCustom = 0;
                    formData.items.forEach((item) => {
                      const product = products.find((p) => p._id === item.product);
                      if (product) {
                        const quantity = parseInt(item.quantity) || 0;
                        const originalPrice = parseFloat(product.price) || 0;
                        subtotalOriginal += originalPrice * quantity;
                        const customPrice = item.customPrice && item.customPrice !== "" ? parseFloat(item.customPrice) : originalPrice;
                        subtotalCustom += customPrice * quantity;
                      }
                    });
                    const discount = parseFloat(formData.discount) || 0;
                    const tax = parseFloat(formData.tax) || 0;
                    
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal (Original Prices):</span>
                          <span>₹{subtotalOriginal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount:</span>
                            <span>-₹{discount.toFixed(2)}</span>
                          </div>
                        )}
                        {tax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Tax:</span>
                            <span>+₹{tax.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Final Amount:</span>
                          <span>₹{calculateTotal().toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm">Order Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus" className="text-sm">Payment Status</Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value) => {
                        setFormData({ 
                          ...formData, 
                          paymentStatus: value,
                          paidAmount: value === "paid" ? calculateTotal().toFixed(2) : value === "unpaid" ? "0" : formData.paidAmount
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(formData.paymentStatus === "partial" || formData.paymentStatus === "paid") && (
                  <div className="space-y-2">
                    <Label htmlFor="paidAmount" className="text-sm">Paid Amount (₹)</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, paidAmount: e.target.value })
                      }
                      min="0"
                      max={calculateTotal()}
                      step="0.01"
                      required
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Total Amount: ₹{calculateTotal().toFixed(2)} | Due: ₹{(calculateTotal() - parseFloat(formData.paidAmount || 0)).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm">Payment Method</Label>
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
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate" className="text-sm">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryDate: e.target.value })
                      }
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
                    placeholder="Additional notes"
                    rows={2}
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
                  {isSubmitting ? "Creating..." : "Create Order"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Filter className="h-4 w-4 md:h-5 md:w-5" />
              Search & Filters
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset Filters</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by order number, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="text-sm h-10"
                />
                <Button onClick={handleSearch} size="icon" className="shrink-0 h-10 w-10">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="orderNumber">Sort by Order #</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent align="start" side="bottom" sideOffset={5} avoidCollisions={false}>
                <SelectItem value="all">All Months</SelectItem>
                {isMounted && (() => {
                  const months = [];
                  const now = new Date();
                  // Generate last 12 months
                  for (let i = 0; i < 12; i++) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const value = `${year}-${month}`;
                    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    months.push(<SelectItem key={value} value={value}>{label}</SelectItem>);
                  }
                  return months;
                })()}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Orders</CardTitle>
          <CardDescription className="text-sm">
            Showing {pagination.totalItems} order(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {orders.map((order) => (
                <Card key={order._id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col gap-4">
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base md:text-lg font-semibold">
                          {order.orderNumber}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded capitalize ${getPaymentStatusColor(
                            order.paymentStatus
                          )}`}
                        >
                          {order.paymentStatus}
                        </span>
                        {order.invoice && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Invoiced
                          </span>
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground block">Customer:</span>
                          <p className="font-medium truncate">{order.customer?.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Total:</span>
                          <p className="font-medium">₹{parseFloat(order.finalAmount).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Paid:</span>
                          <p className="font-medium text-green-600">₹{parseFloat(order.paidAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Due:</span>
                          <p className="font-medium text-red-600">₹{(parseFloat(order.finalAmount) - parseFloat(order.paidAmount || 0)).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Items:</span>
                          <p className="font-medium">{order.items.length}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">
                            {order.deliveryDate ? "Delivery Date:" : "Order Date:"}
                          </span>
                          <p className="font-medium">
                            {formatDate(order.deliveryDate || order.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className={`grid ${order.status === 'cancelled' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} gap-2 pt-2 border-t`}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsViewOrderDialogOpen(true);
                          }}
                          className="w-full text-xs sm:text-sm h-9"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          View Order
                        </Button>
                        
                        <Select
                          value={order.status}
                          onValueChange={(value) =>
                            handleStatusChange(order._id, value)
                          }
                        >
                          <SelectTrigger className="w-full text-xs sm:text-sm h-9 pr-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="out-for-delivery">
                              Out for Delivery
                            </SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={order.paymentStatus}
                          onValueChange={(value) =>
                            handlePaymentStatusChange(order, value)
                          }
                        >
                          <SelectTrigger className="w-full text-xs sm:text-sm h-9 pr-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>

                        {order.invoice ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              window.location.href = `/dashboard/invoices/${order.invoice._id}`;
                            }}
                            className="w-full text-xs sm:text-sm h-9"
                          >
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            View Invoice
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsInvoiceDialogOpen(true);
                            }}
                            className="w-full text-xs sm:text-sm h-9"
                          >
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Create Invoice
                          </Button>
                        )}

                        {/* Delete Button - Only for Cancelled Orders */}
                        {order.status === 'cancelled' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(order)}
                            className="w-full text-xs sm:text-sm h-9"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Delete
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
          {!isLoading && orders.length > 0 && (
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

      {/* Create Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Create Invoice</DialogTitle>
            <DialogDescription className="text-sm">
              Generate invoice for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Order Summary */}
            {selectedOrder && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-sm mb-2">Order Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Customer:</span>
                    <p className="font-medium truncate">{selectedOrder.customer?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total:</span>
                    <p className="font-medium">₹{parseFloat(selectedOrder.finalAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Paid:</span>
                    <p className="font-medium text-green-600">₹{parseFloat(selectedOrder.paidAmount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Due:</span>
                    <p className="font-medium text-red-600">₹{(parseFloat(selectedOrder.finalAmount) - parseFloat(selectedOrder.paidAmount || 0)).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Status and Terms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentStatus" className="text-sm">Payment Status</Label>
                <Select
                  value={invoiceData.paymentStatus}
                  onValueChange={(value) => {
                    setInvoiceData({ 
                      ...invoiceData, 
                      paymentStatus: value,
                      paidAmount: value === "paid" ? selectedOrder?.finalAmount.toString() : value === "unpaid" ? "0" : invoiceData.paidAmount,
                      paymentTerms: value === "paid" ? "Paid in full" : invoiceData.paymentTerms
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial Payment</SelectItem>
                    <SelectItem value="paid">Fully Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms" className="text-sm">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={invoiceData.paymentTerms}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, paymentTerms: e.target.value })
                  }
                  placeholder="Due on receipt"
                />
              </div>
            </div>

            {/* Due Date and Paid Amount Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invoiceData.paymentStatus !== "paid" && (
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm">
                    Due Date {invoiceData.paymentStatus === "unpaid" ? "(Optional)" : ""}
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, dueDate: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {invoiceData.paymentStatus === "unpaid" ? "Leave empty for immediate payment" : "Set payment deadline"}
                  </p>
                </div>
              )}

              {invoiceData.paymentStatus === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="paidAmount" className="text-sm">Paid Amount (₹)</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    value={invoiceData.paidAmount}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, paidAmount: e.target.value })
                    }
                    min="0"
                    max={selectedOrder?.finalAmount}
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total: ₹{selectedOrder?.finalAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Paid Status Message */}
            {invoiceData.paymentStatus === "paid" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  Full payment of ₹{selectedOrder?.finalAmount.toFixed(2)} received
                </p>
              </div>
            )}

            {/* Notes and Terms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNotes" className="text-sm">Notes</Label>
                <Textarea
                  id="invoiceNotes"
                  value={invoiceData.notes}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, notes: e.target.value })
                  }
                  placeholder="Invoice notes (optional)"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceTerms" className="text-sm">Terms & Conditions</Label>
                <Textarea
                  id="invoiceTerms"
                  value={invoiceData.terms}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, terms: e.target.value })
                  }
                  placeholder="Terms and conditions (optional)"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsInvoiceDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Record Payment</DialogTitle>
            <DialogDescription className="text-sm">
              Enter payment amount for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span className="font-medium">₹{parseFloat(selectedOrder?.finalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-medium text-green-600">₹{parseFloat(selectedOrder?.paidAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-bold border-t pt-1">
                  <span className="text-muted-foreground">Remaining Due:</span>
                  <span className="text-red-600">₹{(parseFloat(selectedOrder?.finalAmount || 0) - parseFloat(selectedOrder?.paidAmount || 0)).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount" className="text-sm">Payment Amount (₹) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0.01"
                  max={parseFloat(selectedOrder?.finalAmount || 0) - parseFloat(selectedOrder?.paidAmount || 0)}
                  step="0.01"
                  placeholder="Enter amount"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <>
                      {parseFloat(selectedOrder?.paidAmount || 0) + parseFloat(paymentAmount) >= parseFloat(selectedOrder?.finalAmount || 0)
                        ? "✓ This will mark the order as PAID"
                        : `This will mark the order as PARTIAL (Due: ₹${(parseFloat(selectedOrder?.finalAmount || 0) - parseFloat(selectedOrder?.paidAmount || 0) - parseFloat(paymentAmount)).toFixed(2)})`
                      }
                    </>
                  )}
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setPaymentAmount("");
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="w-full sm:w-auto"
              >
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unpaid Confirmation Dialog */}
      <Dialog open={isUnpaidDialogOpen} onOpenChange={setIsUnpaidDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Reset Payment Status</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to mark order {selectedOrder?.orderNumber} as unpaid?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs sm:text-sm text-yellow-800">
                This will reset the paid amount to ₹0.00 and mark the order as unpaid.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-medium">₹{parseFloat(selectedOrder?.finalAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Currently Paid:</span>
                <span className="font-medium text-green-600">₹{parseFloat(selectedOrder?.paidAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsUnpaidDialogOpen(false);
                setSelectedOrder(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleUnpaidConfirm}
              className="w-full sm:w-auto"
            >
              Reset to Unpaid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Order Dialog */}
      <Dialog open={isViewOrderDialogOpen} onOpenChange={(open) => {
        setIsViewOrderDialogOpen(open);
        if (!open) {
          setIsEditMode(false);
          setEditOrderData({ items: [], notes: "", deliveryDate: "" });
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Order" : "Order Details"}</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customer?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedOrder.status}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Payment: </span>
                    <span className="capitalize">{selectedOrder.paymentStatus}</span>
                  </p>
                </div>
              </div>

              {/* Order Items - View or Edit Mode */}
              {!isEditMode ? (
                <>
                  {/* View Mode - Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium">Product</th>
                            <th className="text-center p-3 text-sm font-medium">Qty</th>
                            <th className="text-right p-3 text-sm font-medium">Price</th>
                            <th className="text-right p-3 text-sm font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedOrder.items?.map((item, index) => (
                            <tr key={index} className="hover:bg-muted/50">
                              <td className="p-3">
                                <p className="font-medium text-sm">{item.product?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.product?.size?.value}{item.product?.size?.unit} - {item.product?.bottlesPerCarton} bottles/carton
                                </p>
                              </td>
                              <td className="p-3 text-center text-sm">{item.quantity}</td>
                              <td className="p-3 text-right text-sm">₹{item.price?.toFixed(2)}</td>
                              <td className="p-3 text-right text-sm font-medium">₹{item.subtotal?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit Mode - Form */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Order Items</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddItemToOrder}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    {editOrderData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg">
                        <div className="col-span-5">
                          <Select
                            value={item.product}
                            onValueChange={(value) => handleUpdateOrderItem(index, "product", value)}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product._id} value={product._id}>
                                  {product.name} ({product.size.value}{product.size.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleUpdateOrderItem(index, "quantity", parseInt(e.target.value) || 1)}
                            min="1"
                            className="text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Custom Price"
                            value={item.customPrice}
                            onChange={(e) => handleUpdateOrderItem(index, "customPrice", e.target.value)}
                            step="0.01"
                            className="text-xs"
                          />
                        </div>
                        <div className="col-span-1 flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItemFromOrder(index)}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Edit Delivery Date */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-delivery-date" className="text-sm">Delivery Date</Label>
                    <Input
                      id="edit-delivery-date"
                      type="date"
                      value={editOrderData.deliveryDate}
                      onChange={(e) => setEditOrderData({ ...editOrderData, deliveryDate: e.target.value })}
                    />
                  </div>

                  {/* Edit Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes" className="text-sm">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={editOrderData.notes}
                      onChange={(e) => setEditOrderData({ ...editOrderData, notes: e.target.value })}
                      rows={2}
                      placeholder="Order notes"
                    />
                  </div>
                </>
              )}

              {/* Order Summary - Always visible */}
              {!isEditMode && (
                <>
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>₹{selectedOrder.totalAmount?.toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-₹{selectedOrder.discount?.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>₹{selectedOrder.tax?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total:</span>
                      <span>₹{selectedOrder.finalAmount?.toFixed(2)}</span>
                    </div>
                    {selectedOrder.paidAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid:</span>
                        <span>₹{selectedOrder.paidAmount?.toFixed(2)}</span>
                      </div>
                    )}
                    {(selectedOrder.finalAmount - selectedOrder.paidAmount) > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-red-600">
                        <span>Due:</span>
                        <span>₹{(selectedOrder.finalAmount - selectedOrder.paidAmount)?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {(selectedOrder.deliveryDate || selectedOrder.notes) && (
                    <div className="space-y-2 p-4 border rounded-lg">
                      {selectedOrder.deliveryDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Delivery Date</p>
                          <p className="font-medium">{formatDate(selectedOrder.deliveryDate)}</p>
                        </div>
                      )}
                      {selectedOrder.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{selectedOrder.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isEditMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsViewOrderDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                {isAdmin && (
                  <Button
                    onClick={handleEditOrder}
                    className="w-full sm:w-auto"
                  >
                    Edit Order
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOrder}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cancelled Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order{" "}
              <span className="font-semibold">{orderToDelete?.orderNumber}</span>?
              This action cannot be undone and will permanently remove this order from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
