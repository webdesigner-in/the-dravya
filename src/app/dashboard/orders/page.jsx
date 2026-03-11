"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { getUserFriendlyError } from "@/lib/errorMessages";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get("customer");
  const isAdmin = useAuthStore((state) => state.isAdmin());
  
  const [orders, setOrders] = useState([]);
  const [allLoadedOrders, setAllLoadedOrders] = useState([]); // Cache all loaded orders
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // New: Loading more orders
  const [isSearchingDB, setIsSearchingDB] = useState(false); // Separate loading state for DB search
  const [hasMoreOrders, setHasMoreOrders] = useState(true); // New: Track if more orders available
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isUnpaidDialogOpen, setIsUnpaidDialogOpen] = useState(false);
  const [isViewOrderDialogOpen, setIsViewOrderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [editOrderData, setEditOrderData] = useState({
    items: [],
    notes: "",
    deliveryDate: "",
  });
  
  // Pagination state (kept for API compatibility)
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
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    orderType: "customer", // 'customer' or 'guest'
    customer: customerIdFromUrl || "",
    guestInfo: {
      name: "",
      phone: "",
      address: "",
    },
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

  // Memoized fetch functions to prevent infinite loops
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const page = 1; // Always start from page 1 with infinite scroll
      
      let url = "/api/orders?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (paymentFilter !== "all") url += `paymentStatus=${paymentFilter}&`;
      if (dateFilter !== "all") url += `date=${dateFilter}&`;
      if (customerIdFromUrl) url += `customer=${customerIdFromUrl}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (sortBy) url += `sortBy=${sortBy}&`;
      url += `page=${page}&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const ordersData = data.orders || [];
        
        // Set pagination info
        if (data.pagination) {
          setPagination(data.pagination);
          setHasMoreOrders(data.pagination.hasMore);
        }
        
        // Reset data (for filters/search)
        setOrders(ordersData);
        setAllLoadedOrders(ordersData);
      } else {
        toast.error("Failed to fetch orders");
      }
    } catch (error) {
      toast.error("Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, paymentFilter, dateFilter, customerIdFromUrl, searchQuery, sortBy]);

  // Client-side search in loaded orders
  const searchLoadedOrders = useCallback((query) => {
    if (!query || query.trim() === "") return allLoadedOrders;
    
    const lowerQuery = query.toLowerCase().trim();
    return allLoadedOrders.filter(order => 
      order.orderNumber?.toLowerCase().includes(lowerQuery) ||
      order.customer?.name?.toLowerCase().includes(lowerQuery) ||
      order.customer?.phone?.includes(lowerQuery) ||
      order.guestInfo?.name?.toLowerCase().includes(lowerQuery) ||
      order.guestInfo?.phone?.includes(lowerQuery)
    );
  }, [allLoadedOrders]);

  // Hybrid search: client-side first, then database
  const performHybridSearch = useCallback(async (query) => {
    if (!query || query.trim() === "") {
      // No search query - show all loaded orders with filters
      setOrders(allLoadedOrders);
      return;
    }

    // Step 1: Search in already loaded orders (instant)
    const localResults = searchLoadedOrders(query);
    
    if (localResults.length > 0) {
      // Found results in cache - show immediately
      setOrders(localResults);
      return;
    }
    
    // Step 2: No local results - search database
    setIsSearchingDB(true);
    try {
      let url = `/api/orders?search=${encodeURIComponent(query)}&limit=20`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (paymentFilter !== "all") url += `&paymentStatus=${paymentFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const dbResults = data.orders || [];
        
        // Update cache with new results
        setAllLoadedOrders(prev => {
          const existingIds = new Set(prev.map(o => o._id));
          const newOrders = dbResults.filter(o => !existingIds.has(o._id));
          return [...prev, ...newOrders];
        });
        
        setOrders(dbResults);
        
        if (dbResults.length === 0) {
          toast.info("No orders found matching your search");
        }
      }
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearchingDB(false);
    }
  }, [allLoadedOrders, searchLoadedOrders, statusFilter, paymentFilter]);

  const fetchCustomers = useCallback(async (searchTerm = "") => {
    try {
      let url = "/api/customers?limit=100"; // Load more customers for dropdown
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      const response = await fetch(url);
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
      // Error already logged
    }
  }, [customerIdFromUrl]);

  const fetchProducts = useCallback(async () => {
    try {
      // Only fetch active products with stock > 0 for better performance
      const response = await fetch("/api/products?active=true");
      if (response.ok) {
        const data = await response.json();
        // Filter products with stock > 0 on client side as additional safety
        const activeProducts = (data.products || []).filter(p => p.stock > 0);
        setProducts(activeProducts);
      }
    } catch (error) {
      // Error already logged
    }
  }, []);

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

  // Auto-load orders on mount (no manual load button needed)
  useEffect(() => {
    if (!ordersLoaded) {
      setOrdersLoaded(true);
    }
  }, [ordersLoaded]);

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      // Check if user is near bottom of page (within 200px)
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      
      if (isNearBottom && !isLoading && !isLoadingMore && hasMoreOrders && ordersLoaded && !searchQuery) {
        loadMoreOrders();
      }
    };

    // Throttle scroll events
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
  }, [isLoading, isLoadingMore, hasMoreOrders, ordersLoaded, searchQuery]);

  // Load more orders function
  const loadMoreOrders = async () => {
    if (isLoadingMore || !hasMoreOrders) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = Math.floor(allLoadedOrders.length / 20) + 1;
      let url = "/api/orders?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (paymentFilter !== "all") url += `paymentStatus=${paymentFilter}&`;
      if (dateFilter !== "all") url += `date=${dateFilter}&`;
      if (customerIdFromUrl) url += `customer=${customerIdFromUrl}&`;
      if (sortBy) url += `sortBy=${sortBy}&`;
      url += `page=${nextPage}&limit=20`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const newOrders = data.orders || [];
        
        if (newOrders.length === 0) {
          setHasMoreOrders(false);
        } else {
          // Append new orders to existing ones
          setAllLoadedOrders(prev => [...prev, ...newOrders]);
          setOrders(prev => [...prev, ...newOrders]);
          
          // Update pagination info
          if (data.pagination) {
            setPagination(data.pagination);
            setHasMoreOrders(data.pagination.hasMore);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load more orders:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch orders when dependencies change - with debouncing for filters
  useEffect(() => {
    if (!ordersLoaded) return;
    
    const timer = setTimeout(() => {
      fetchOrders(); // Reset data when filters change
    }, 500); // 500ms debounce for filters

    return () => clearTimeout(timer);
  }, [statusFilter, paymentFilter, dateFilter, sortBy, ordersLoaded, fetchOrders]);

  // Lazy load customers and products only when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      if (customers.length === 0) {
        fetchCustomers();
      }
      if (products.length === 0) {
        fetchProducts();
      }
    }
  }, [isDialogOpen]);

  // Load products when view order dialog opens (needed for edit mode)
  useEffect(() => {
    if (isViewOrderDialogOpen) {
      if (products.length === 0) {
        fetchProducts();
      }
    }
  }, [isViewOrderDialogOpen, fetchProducts]);

  // Debounce customer search
  useEffect(() => {
    if (!isDialogOpen) return; // Only search when dialog is open
    
    const timer = setTimeout(() => {
      if (customerSearchQuery) {
        fetchCustomers(customerSearchQuery);
      } else {
        fetchCustomers(); // Load all when search is empty
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [customerSearchQuery, isDialogOpen]);

  // Debounce main search query
  useEffect(() => {
    if (!ordersLoaded) return; // Only search if orders are loaded
    
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.trim()) {
        performHybridSearch(searchQuery);
      } else {
        // If search is cleared, show all loaded orders with current filters
        setOrders(allLoadedOrders);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, ordersLoaded, performHybridSearch, allLoadedOrders]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('customer-dropdown');
      const searchInput = event.target.closest('input[placeholder*="Search and select customer"]');
      
      if (dropdown && !dropdown.contains(event.target) && !searchInput) {
        dropdown.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    if (!ordersLoaded) {
      setOrdersLoaded(true);
      return;
    }
    
    // Reset infinite scroll state for search
    setHasMoreOrders(true);
    
    // Trigger search immediately
    if (searchQuery && searchQuery.trim()) {
      performHybridSearch(searchQuery);
    } else {
      fetchOrders(); // Reset to show all orders
    }
  };

  const handleRefresh = () => {
    // If we're on a customer-specific page, redirect to all orders
    if (customerIdFromUrl) {
      window.location.href = "/dashboard/orders";
      return;
    }
    
    // Reset all filters and infinite scroll state
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
    setSortBy("date");
    setHasMoreOrders(true);
    
    // Reload data
    if (ordersLoaded) {
      fetchOrders();
    }
    toast.success("Filters reset and data refreshed");
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
      toast.error(getUserFriendlyError(error));
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
      orderType: "customer",
      customer: customerIdFromUrl || "",
      guestInfo: {
        name: "",
        phone: "",
        address: "",
      },
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
    setCustomerSearchQuery(""); // Reset customer search
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
      toast.error(getUserFriendlyError(error));
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
      toast.error(getUserFriendlyError(error));
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
      toast.error(getUserFriendlyError(error));
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const handlePaymentStatusChange = async (order, newStatus) => {
    // If order has an invoice, don't allow direct payment status changes
    // User must use "Record Payment" on the invoice instead
    if (order.invoice) {
      toast.error("This order has an invoice. Please use 'Record Payment' to update payment status.");
      return;
    }

    // For orders WITHOUT invoices, allow direct payment status changes
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
      toast.error(getUserFriendlyError(error));
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

    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

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
      toast.error(getUserFriendlyError(error));
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
      toast.error(getUserFriendlyError(error));
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
        description={customerIdFromUrl ? `Viewing orders for ${selectedCustomerName || "customer"}` : (isAdmin ? "Viewing all orders from all users" : "Manage and track your orders")}
        backHref={customerIdFromUrl ? "/dashboard/customers" : "/dashboard"}
        badge={
          <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
            {isAdmin ? "All Users" : "Personal"}
          </Badge>
        }
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
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[98vw] sm:w-[95vw] md:w-full p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-base sm:text-lg md:text-xl">Create New Order</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Add a new order for a customer
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                {/* Order Type Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Order Type *</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orderType"
                        value="customer"
                        checked={formData.orderType === "customer"}
                        onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Regular Customer</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orderType"
                        value="guest"
                        checked={formData.orderType === "guest"}
                        onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Guest / Walk-in</span>
                    </label>
                  </div>
                </div>

                {/* Customer Selection (for regular orders) */}
                {formData.orderType === "customer" && (
                  <div className="space-y-2">
                    <Label htmlFor="customer" className="text-sm">Customer *</Label>
                    
                    {/* Mobile-friendly searchable customer selector */}
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <Input
                          placeholder="Search and select customer..."
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                          }}
                          onFocus={() => {
                            // Show dropdown when focused
                            const dropdown = document.getElementById('customer-dropdown');
                            if (dropdown) dropdown.classList.remove('hidden');
                          }}
                          className="pl-10 h-10 text-sm"
                          autoComplete="off"
                          type="text"
                          required={!formData.customer}
                        />
                      </div>
                      
                      {/* Selected customer display */}
                      {formData.customer && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                          <span className="text-sm text-blue-900">
                            {customers.find(c => c._id === formData.customer)?.name || 'Selected customer'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, customer: "" });
                              setCustomerSearchQuery("");
                            }}
                            className="h-6 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Dropdown list */}
                      {customerSearchQuery && (
                        <div 
                          id="customer-dropdown"
                          className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-75 overflow-y-auto"
                        >
                          {customers.length > 0 ? (
                            customers.map((customer) => (
                              <button
                                key={customer._id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, customer: customer._id });
                                  setCustomerSearchQuery("");
                                  document.getElementById('customer-dropdown')?.classList.add('hidden');
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                              >
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-xs text-gray-500">{customer.phone}</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {customerSearchQuery ? "No customers found" : "Start typing to search..."}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Guest Info (for guest orders) */}
                {formData.orderType === "guest" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
                    <div className="space-y-2">
                      <Label htmlFor="guestName" className="text-sm">Guest Name *</Label>
                      <Input
                        id="guestName"
                        type="text"
                        placeholder="Enter customer name"
                        value={formData.guestInfo.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guestInfo: { ...formData.guestInfo, name: e.target.value },
                          })
                        }
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone" className="text-sm">Phone (Optional)</Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.guestInfo.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guestInfo: { ...formData.guestInfo, phone: e.target.value },
                          })
                        }
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestAddress" className="text-sm">Address (Optional)</Label>
                      <Textarea
                        id="guestAddress"
                        placeholder="Enter delivery address"
                        value={formData.guestInfo.address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guestInfo: { ...formData.guestInfo, address: e.target.value },
                          })
                        }
                        className="text-sm min-h-15"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <Label className="text-sm">Order Items *</Label>
                    <Button type="button" size="sm" onClick={addItem} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  {formData.items.map((item, index) => {
                    const selectedProduct = products.find(p => p._id === item.product);
                    return (
                      <div key={index} className="space-y-3 p-3 sm:p-4 border rounded-lg bg-gray-50">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs sm:text-sm">Product *</Label>
                            <Select
                              value={item.product}
                              onValueChange={(value) =>
                                updateItem(index, "product", value)
                              }
                              required
                            >
                              <SelectTrigger className="h-10 text-sm">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent className="max-h-75">
                                {products.map((product) => (
                                  <SelectItem key={product._id} value={product._id}>
                                    {product.name} - ₹{product.price} ({product.stock}{" "}
                                    in stock)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm">Quantity *</Label>
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, "quantity", e.target.value === "" ? "" : parseInt(e.target.value) || 1)
                                }
                                min="1"
                                required
                                className="h-10 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm">Custom Price (₹)</Label>
                              <Input
                                type="number"
                                placeholder={selectedProduct ? `₹${selectedProduct.price}` : "Price"}
                                value={item.customPrice}
                                onChange={(e) =>
                                  updateItem(index, "customPrice", e.target.value)
                                }
                                min="0"
                                step="0.01"
                                className="h-10 text-sm"
                              />
                            </div>
                          </div>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="w-full"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove Item
                            </Button>
                          )}
                        </div>
                        {selectedProduct && (
                          <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-1 pt-2 border-t">
                            <span>Original: ₹{selectedProduct.price}</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount" className="text-xs sm:text-sm">Discount (₹) - Auto-calculated</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={formData.discount}
                      readOnly
                      className="bg-gray-50 h-10 text-sm"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated from custom prices
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax" className="text-xs sm:text-sm">Tax (₹)</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={formData.tax}
                      onChange={(e) =>
                        setFormData({ ...formData, tax: e.target.value })
                      }
                      min="0"
                      step="0.01"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
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
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span>Subtotal (Original):</span>
                          <span className="font-medium">₹{subtotalOriginal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-xs sm:text-sm text-green-600">
                            <span>Discount:</span>
                            <span className="font-medium">-₹{discount.toFixed(2)}</span>
                          </div>
                        )}
                        {tax > 0 && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span>Tax:</span>
                            <span className="font-medium">+₹{tax.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm sm:text-base font-bold border-t pt-2 mt-2">
                          <span>Final Amount:</span>
                          <span>₹{calculateTotal().toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs sm:text-sm">Order Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="h-10 text-sm">
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
                    <Label htmlFor="paymentStatus" className="text-xs sm:text-sm">Payment Status</Label>
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
                      <SelectTrigger className="h-10 text-sm">
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
                    <Label htmlFor="paidAmount" className="text-xs sm:text-sm">Paid Amount (₹)</Label>
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
                      className="h-10 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Total: ₹{calculateTotal().toFixed(2)} | Due: ₹{(calculateTotal() - parseFloat(formData.paidAmount || 0)).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-xs sm:text-sm">Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger className="h-10 text-sm">
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
                    <Label htmlFor="deliveryDate" className="text-xs sm:text-sm">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryDate: e.target.value })
                      }
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6 flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
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
              <Input
                placeholder="Search by order number, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="text-sm h-10"
              />
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
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Orders</CardTitle>
          <CardDescription className="text-sm">
            {orders.length > 0 ? (
              <>
                Showing {orders.length} order(s)
                {hasMoreOrders && !searchQuery && (
                  <span className="text-muted-foreground"> • Scroll down to load more</span>
                )}
              </>
            ) : (
              "Your orders will appear here"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {isLoading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            </div>
          ) : isSearchingDB ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-sm text-muted-foreground">
                Searching database for "{searchQuery}"...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <>
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
                        {(order.orderType === "guest") && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                            Guest
                          </span>
                        )}
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
                        {order.invoice && order.invoice._id && (
                          <>
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Invoiced
                            </span>
                            {/* Invoice Payment Status Badge */}
                            {order.invoice.status === 'paid' && (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                                ✓ Invoice Paid
                              </span>
                            )}
                            {order.invoice.status === 'partial' && (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">
                                ⚠ Partial Payment
                              </span>
                            )}
                            {(order.invoice.status === 'sent' || order.invoice.status === 'draft') && order.invoice.balanceAmount > 0 && (
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                                ✗ Invoice Unpaid
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground block">
                            {(order.orderType === "guest") ? "Guest:" : "Customer:"}
                          </span>
                          <p className="font-medium truncate">
                            {(order.orderType === "guest") 
                              ? order.guestInfo?.name || "Guest Customer"
                              : order.customer?.name}
                          </p>
                          {(order.orderType === "guest") && order.guestInfo?.phone && (
                            <p className="text-xs text-muted-foreground">{order.guestInfo.phone}</p>
                          )}
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
                        {/* Show invoice payment info if invoice exists */}
                        {order.invoice && order.invoice._id && (
                          <>
                            <div className="col-span-2 sm:col-span-3 pt-2 border-t">
                              <span className="text-muted-foreground block text-xs">Invoice Status:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="font-medium text-sm">{order.invoice.invoiceNumber || 'N/A'}</p>
                                <Badge className={`text-xs ${
                                  order.invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  order.invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {order.invoice.status === 'paid' ? 'Paid' :
                                   order.invoice.status === 'partial' ? 'Partial' : 'Unpaid'}
                                </Badge>
                                {order.invoice.paymentHistory && order.invoice.paymentHistory.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({order.invoice.paymentHistory.length} payment{order.invoice.paymentHistory.length > 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Buttons - Compact Layout */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {/* Primary Actions */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsViewOrderDialogOpen(true);
                          }}
                          className="text-xs h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        {/* Status Dropdowns - Compact */}
                        <Select
                          value={order.status}
                          onValueChange={(value) =>
                            handleStatusChange(order._id, value)
                          }
                        >
                          <SelectTrigger className="text-xs h-8 w-auto min-w-25">
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

                        <Select
                          value={order.paymentStatus}
                          onValueChange={(value) =>
                            handlePaymentStatusChange(order, value)
                          }
                          disabled={!!order.invoice}
                        >
                          <SelectTrigger className="text-xs h-8 w-auto min-w-22.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Invoice Actions */}
                        {order.invoice && order.invoice._id ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                if (order.invoice && order.invoice._id) {
                                  window.location.href = `/dashboard/invoices/${order.invoice._id}`;
                                } else {
                                  toast.error("Invoice ID not found");
                                }
                              }}
                              className="text-xs h-8"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Invoice
                            </Button>
                            {order.invoice.status !== 'paid' && order.invoice.balanceAmount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(order.invoice);
                                  setSelectedOrder(order);
                                  setPaymentAmount("");
                                  setPaymentMethod("cash");
                                  setPaymentNotes("");
                                  setIsRecordPaymentDialogOpen(true);
                                }}
                                className="text-xs h-8 border-green-500 text-green-600 hover:bg-green-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Payment
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsInvoiceDialogOpen(true);
                            }}
                            className="text-xs h-8"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Create Invoice
                          </Button>
                        )}

                        {/* Delete Button - Only for Cancelled Orders and Admin Only */}
                        {order.status === 'cancelled' && isAdmin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(order)}
                            className="text-xs h-8"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
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
                  <p className="text-sm text-muted-foreground">Loading more orders...</p>
                </div>
              )}
              
              {/* End of Results Indicator */}
              {!hasMoreOrders && orders.length > 0 && !searchQuery && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    You've reached the end of all orders
                  </p>
                </div>
              )}
            </>
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
              {/* Customer/Guest Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {(selectedOrder.orderType === "guest") ? "Guest Customer" : "Customer"}
                  </p>
                  {(selectedOrder.orderType === "guest") ? (
                    <>
                      <p className="font-medium">{selectedOrder.guestInfo?.name || "Guest"}</p>
                      {selectedOrder.guestInfo?.phone && (
                        <p className="text-sm text-muted-foreground">{selectedOrder.guestInfo.phone}</p>
                      )}
                      {selectedOrder.guestInfo?.address && (
                        <p className="text-xs text-muted-foreground mt-1">{selectedOrder.guestInfo.address}</p>
                      )}
                      <Badge variant="secondary" className="mt-2 text-xs">Walk-in Order</Badge>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{selectedOrder.customer?.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.customer?.phone}</p>
                    </>
                  )}
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
                <Button
                  onClick={handleEditOrder}
                  className="w-full sm:w-auto"
                >
                  Edit Order
                </Button>
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

      {/* Record Payment on Invoice Dialog */}
      <Dialog open={isRecordPaymentDialogOpen} onOpenChange={setIsRecordPaymentDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Record Payment on Invoice</DialogTitle>
            <DialogDescription className="text-sm">
              Record a payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm">Invoice Summary</h4>
                  <Badge className={`${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                    selectedInvoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedInvoice.status === 'paid' ? 'Paid' :
                     selectedInvoice.status === 'partial' ? 'Partial' : 'Unpaid'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                  <div>
                    <span className="text-muted-foreground block">Invoice Total:</span>
                    <p className="font-semibold text-base">₹{parseFloat(selectedInvoice.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Already Paid:</span>
                    <p className="font-semibold text-base text-green-600">₹{parseFloat(selectedInvoice.paidAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <span className="text-muted-foreground block">Balance Due:</span>
                    <p className="font-bold text-lg text-red-600">₹{parseFloat(selectedInvoice.balanceAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-3">
                    <h4 className="font-semibold text-sm">Payment History</h4>
                  </div>
                  <div className="divide-y max-h-48 overflow-y-auto">
                    {selectedInvoice.paymentHistory.map((payment, index) => (
                      <div key={index} className="p-3 hover:bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">₹{parseFloat(payment.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {payment.paymentMethod} • {formatDate(payment.date)}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-muted-foreground italic">{payment.notes}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Payment {index + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Payment Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                
                const amount = parseFloat(paymentAmount);
                
                if (amount <= 0) {
                  toast.error("Payment amount must be greater than 0");
                  return;
                }
                
                if (amount > selectedInvoice.balanceAmount) {
                  toast.error(`Payment amount cannot exceed balance due of ₹${selectedInvoice.balanceAmount.toFixed(2)}`);
                  return;
                }

                setIsSubmitting(true);
                
                try {
                  const response = await fetch(`/api/invoices/${selectedInvoice._id}/payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      amount,
                      paymentMethod,
                      notes: paymentNotes,
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || "Failed to record payment");
                  }

                  toast.success(data.message || "Payment recorded successfully!");
                  setIsRecordPaymentDialogOpen(false);
                  setPaymentAmount("");
                  setPaymentMethod("cash");
                  setPaymentNotes("");
                  setSelectedInvoice(null);
                  setSelectedOrder(null);
                  
                  // Refresh orders to show updated invoice status
                  await fetchOrders();
                } catch (error) {
                  toast.error(getUserFriendlyError(error));
                } finally {
                  setIsSubmitting(false);
                }
              }} className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">New Payment Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-amount" className="text-sm">Payment Amount (₹) *</Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min="0.01"
                        max={selectedInvoice.balanceAmount}
                        step="0.01"
                        placeholder="Enter amount"
                        required
                        autoFocus
                      />
                      {paymentAmount && parseFloat(paymentAmount) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {parseFloat(selectedInvoice.paidAmount || 0) + parseFloat(paymentAmount) >= parseFloat(selectedInvoice.totalAmount || 0)
                            ? "✓ This will mark the invoice as PAID"
                            : `Remaining: ₹${(parseFloat(selectedInvoice.balanceAmount || 0) - parseFloat(paymentAmount)).toFixed(2)}`
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-method" className="text-sm">Payment Method *</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                        required
                      >
                        <SelectTrigger id="payment-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="payment-notes" className="text-sm">Notes (Optional)</Label>
                    <Textarea
                      id="payment-notes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add any notes about this payment..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsRecordPaymentDialogOpen(false);
                        setPaymentAmount("");
                        setPaymentMethod("cash");
                        setPaymentNotes("");
                        setSelectedInvoice(null);
                        setSelectedOrder(null);
                      }}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    
                    {/* Reset All Payments Button - Only show if there are payments */}
                    {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to reset all payments on this invoice? This will:\n\n• Mark invoice as unpaid\n• Reset paid amount to ₹0\n• Keep payment history for reference\n• Update order payment status\n\nNote: Transactions will remain in the system for audit purposes.`)) {
                            return;
                          }

                          setIsSubmitting(true);
                          try {
                            const response = await fetch(`/api/invoices/${selectedInvoice._id}/reset-payments`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                            });

                            const data = await response.json();

                            if (!response.ok) {
                              throw new Error(data.error || "Failed to reset payments");
                            }

                            toast.success("All payments reset successfully!");
                            setIsRecordPaymentDialogOpen(false);
                            setPaymentAmount("");
                            setPaymentMethod("cash");
                            setPaymentNotes("");
                            setSelectedInvoice(null);
                            setSelectedOrder(null);
                            
                            await fetchOrders();
                          } catch (error) {
                            toast.error(getUserFriendlyError(error));
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                      >
                        Reset All Payments
                      </Button>
                    )}
                    
                    <Button 
                      type="submit"
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

