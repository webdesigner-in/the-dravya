"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  Package,
  IndianRupee,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { useCreateOrder } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";

export default function QuickOrderPage() {
  const router = useRouter();
  const createOrder = useCreateOrder();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [isLoadingLastOrder, setIsLoadingLastOrder] = useState(false);
  
  const [orderItems, setOrderItems] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState("cash");
  const [deliveryDate, setDeliveryDate] = useState("");

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=100");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=100");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchLastOrder = async (customerId) => {
    setIsLoadingLastOrder(true);
    try {
      const response = await fetch(`/api/orders?customer=${customerId}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        if (orders.length > 0) {
          setLastOrder(orders[0]);
        } else {
          setLastOrder(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch last order:", error);
    } finally {
      setIsLoadingLastOrder(false);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c._id === customerId);
    setSelectedCustomer(customer);
    setOrderItems([]);
    setLastOrder(null);
    
    if (customer) {
      fetchLastOrder(customerId);
      // Set default payment terms based on customer history or type
      setPaymentTerms("cash");
    }
  };

  const handleRepeatLastOrder = () => {
    if (!lastOrder || !lastOrder.items) return;
    
    const items = lastOrder.items.map((item) => ({
      product: item.product._id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price,
    }));
    
    setOrderItems(items);
    setPaymentTerms(lastOrder.paymentTerms || "cash");
    toast.success("Last order loaded! Adjust quantities if needed.");
  };

  const handleAddProduct = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;

    const existingItem = orderItems.find((item) => item.product === productId);
    
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.product === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          product: productId,
          productName: product.name,
          quantity: 1,
          price: product.price,
        },
      ]);
    }
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter((item) => item.product !== productId));
    } else {
      setOrderItems(
        orderItems.map((item) =>
          item.product === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter((item) => item.product !== productId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    // Check credit limit
    if (selectedCustomer.creditLimit > 0) {
      const orderTotal = calculateTotal();
      const currentOutstanding = parseFloat(selectedCustomer.outstandingBalance || 0);
      const newOutstanding = currentOutstanding + orderTotal;
      
      if (newOutstanding > selectedCustomer.creditLimit) {
        const available = selectedCustomer.creditLimit - currentOutstanding;
        toast.error(
          `Credit limit exceeded! Available: ₹${available.toFixed(2)}, Order: ₹${orderTotal.toFixed(2)}`,
          { duration: 5000 }
        );
        return;
      }
    }

    const orderData = {
      orderType: "customer",
      customer: selectedCustomer._id,
      items: orderItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        customPrice: item.price.toString(),
      })),
      discount: "0",
      tax: "0",
      status: "pending",
      paymentStatus: paymentTerms === "cash" ? "unpaid" : "unpaid",
      paidAmount: "0",
      paymentMethod: "cash",
      paymentTerms: paymentTerms,
      deliveryDate: deliveryDate || undefined,
      notes: "",
    };

    try {
      await createOrder.mutateAsync(orderData);
      toast.success("Order created successfully!");
      
      // Reset form
      setSelectedCustomer(null);
      setOrderItems([]);
      setLastOrder(null);
      setPaymentTerms("cash");
      setDeliveryDate("");
      setSearchQuery("");
      
      // Optionally redirect to orders page
      // router.push("/dashboard/orders");
    } catch (error) {
      toast.error(error.message || "Failed to create order");
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const filteredProducts = products.filter((product) => product.stock > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Order Entry"
        description="Fast order creation for regular customers"
        backHref="/dashboard"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select Customer</CardTitle>
            <CardDescription>Search and select customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer._id}
                  onClick={() => handleCustomerSelect(customer._id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCustomer?._id === customer._id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.phone}</div>
                  {customer.creditLimit > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Credit: ₹{customer.outstandingBalance?.toFixed(0) || 0} / ₹{customer.creditLimit.toFixed(0)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Order Details</CardTitle>
                <CardDescription>
                  {selectedCustomer
                    ? `Creating order for ${selectedCustomer.name}`
                    : "Select a customer to start"}
                </CardDescription>
              </div>
              {lastOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRepeatLastOrder}
                  disabled={isLoadingLastOrder}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Repeat Last Order
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedCustomer ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a customer to create an order</p>
              </div>
            ) : (
              <>
                {/* Add Products */}
                <div>
                  <Label>Add Products</Label>
                  <Select onValueChange={handleAddProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - ₹{product.price} ({product.stock} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Items */}
                {orderItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Order Items</Label>
                    <div className="border rounded-lg divide-y">
                      {orderItems.map((item) => (
                        <div
                          key={item.product}
                          className="p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-muted-foreground">
                              ₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(item.product, item.quantity - 1)
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleQuantityChange(item.product, item.quantity + 1)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleRemoveItem(item.product)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Delivery Date (Optional)</Label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                {/* Total */}
                {orderItems.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span className="text-2xl">₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Credit Warning */}
                {selectedCustomer.creditLimit > 0 && orderItems.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-yellow-900">Credit Check</div>
                        <div className="text-yellow-700 mt-1">
                          Current Outstanding: ₹{selectedCustomer.outstandingBalance?.toFixed(2) || 0}
                          <br />
                          After this order: ₹{(parseFloat(selectedCustomer.outstandingBalance || 0) + calculateTotal()).toFixed(2)}
                          <br />
                          Credit Limit: ₹{selectedCustomer.creditLimit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={orderItems.length === 0 || createOrder.isPending}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {createOrder.isPending ? "Creating Order..." : "Create Order"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
