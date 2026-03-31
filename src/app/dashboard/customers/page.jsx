"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Users, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useCustomers";

export default function CustomersPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // React Query hooks with infinite scroll
  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useCustomers({ search: debouncedSearch });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  
  // Flatten all pages into single array
  const customers = data?.pages?.flatMap(page => page.customers) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Generate a unique fake phone number
  const generateFakePhone = () => {
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    return `00${randomDigits}`;
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: generateFakePhone(),
    alternatePhone: "",
    street: "",
    area: "",
    city: "Gwalior",
    state: "Madhya Pradesh",
    pincode: "474005",
    landmark: "",
    customerType: "residential",
    creditLimit: "0",
    notes: "",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Generate new phone number when dialog opens for new customer
  useEffect(() => {
    if (isDialogOpen && !editingCustomer) {
      setFormData(prev => ({
        ...prev,
        phone: generateFakePhone(),
        city: "Gwalior",
        state: "Madhya Pradesh",
        pincode: "474005",
      }));
    }
  }, [isDialogOpen, editingCustomer]);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: generateFakePhone(),
      alternatePhone: "",
      street: "",
      area: "",
      city: "Gwalior",
      state: "Madhya Pradesh",
      pincode: "474005",
      landmark: "",
      customerType: "residential",
      creditLimit: "0",
      notes: "",
    });
    setEditingCustomer(null);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone,
      alternatePhone: customer.alternatePhone || "",
      street: customer.address?.street || "",
      area: customer.address?.area || "",
      city: customer.address?.city || "",
      state: customer.address?.state || "",
      pincode: customer.address?.pincode || "",
      landmark: customer.address?.landmark || "",
      customerType: customer.customerType,
      creditLimit: customer.creditLimit.toString(),
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone,
        address: {
          street: formData.street,
          area: formData.area,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          landmark: formData.landmark,
        },
        customerType: formData.customerType,
        creditLimit: parseFloat(formData.creditLimit),
        notes: formData.notes,
      };

      if (editingCustomer) {
        await updateCustomer.mutateAsync({
          customerId: editingCustomer._id,
          updates: payload,
        });
      } else {
        await createCustomer.mutateAsync(payload);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error toast shown automatically by hook
    }
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      await deleteCustomer.mutateAsync(customerToDelete._id);
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      // Error toast shown automatically by hook
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer information and orders"
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
                Add Customer
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? "Update customer details"
                  : "Add a new customer to your database"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="00XXXXXXXX"
                    required
                    maxLength={10}
                  />
                  {!editingCustomer && (
                    <p className="text-xs text-muted-foreground">
                      Auto-generated unique fake number (starts with 00)
                    </p>
                  )}
                  {editingCustomer && (
                    <p className="text-xs text-muted-foreground">
                      You can update the phone number if needed
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    type="tel"
                    value={formData.alternatePhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        alternatePhone: e.target.value,
                      })
                    }
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerType">Customer Type *</Label>
                  <Select
                    value={formData.customerType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, creditLimit: e.target.value })
                    }
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="col-span-2 border-t pt-4">
                  <h3 className="font-medium mb-3">Address Details</h3>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                    placeholder="House/Flat No, Street Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area/Locality</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    placeholder="Area name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input
                    id="landmark"
                    value={formData.landmark}
                    onChange={(e) =>
                      setFormData({ ...formData, landmark: e.target.value })
                    }
                    placeholder="Near..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Gwalior"
                  />
                  {!editingCustomer && (
                    <p className="text-xs text-muted-foreground">
                      Default: Gwalior
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="Madhya Pradesh"
                  />
                  {!editingCustomer && (
                    <p className="text-xs text-muted-foreground">
                      Default: Madhya Pradesh
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                    placeholder="474005"
                  />
                  {!editingCustomer && (
                    <p className="text-xs text-muted-foreground">
                      Default: 474005
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes about the customer"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCustomer.isPending || updateCustomer.isPending}
                >
                  {createCustomer.isPending || updateCustomer.isPending
                    ? "Saving..."
                    : editingCustomer
                    ? "Update Customer"
                    : "Create Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>
                {customers.length > 0 ? (
                  <>
                    {customers.length} customer{customers.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </>
                ) : (
                  "Your customers will appear here"
                )}
              </CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load customers</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? "No customers found matching your search" : "No customers found"}
              </p>
              {!searchQuery && (
                <p className="text-sm text-muted-foreground">
                  Click "Add Customer" to create your first customer
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => (
              <Card key={customer._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="text-base sm:text-lg font-semibold truncate">
                          {customer.name}
                        </h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize w-fit">
                          {customer.customerType}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.address?.city && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {customer.address.area}, {customer.address.city}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Credit Limit Section - Always show if admin */}
                      {isAdmin && (
                        <div className="mt-2 pt-2 border-t">
                          {customer.creditLimit > 0 ? (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Credit Utilization</span>
                                <span className={`font-medium ${
                                  customer.outstandingBalance / customer.creditLimit >= 0.9 ? 'text-red-600' :
                                  customer.outstandingBalance / customer.creditLimit >= 0.7 ? 'text-orange-600' :
                                  'text-green-600'
                                }`}>
                                  ₹{parseFloat(customer.outstandingBalance || 0).toFixed(0)} / ₹{parseFloat(customer.creditLimit).toFixed(0)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    customer.outstandingBalance / customer.creditLimit >= 0.9 ? 'bg-red-600' :
                                    customer.outstandingBalance / customer.creditLimit >= 0.7 ? 'bg-orange-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{
                                    width: `${Math.min((customer.outstandingBalance / customer.creditLimit) * 100, 100)}%`
                                  }}
                                ></div>
                              </div>
                              {customer.outstandingBalance / customer.creditLimit >= 0.9 && (
                                <p className="text-xs text-red-600 mt-1">⚠️ Credit limit almost reached!</p>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {customer.outstandingBalance > 0 ? (
                                <div>
                                  <span className="text-orange-600 font-medium">Outstanding: ₹{parseFloat(customer.outstandingBalance).toFixed(2)}</span>
                                  <span className="ml-2">• No credit limit set</span>
                                </div>
                              ) : (
                                <span>No credit limit set</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                      <Link href={`/dashboard/orders?customer=${customer._id}`}>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          Orders
                        </Button>
                      </Link>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(customer)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
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
                <span className="ml-2 text-sm text-muted-foreground">Loading more customers...</span>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasNextPage && !searchQuery && customers.length > 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No more customers to load</p>
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer{" "}
              <span className="font-semibold">{customerToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteCustomer.isPending}
            >
              {deleteCustomer.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
