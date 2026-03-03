"use client";

import { useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default function CustomersPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasMore: false,
  });

  // Generate a unique fake phone number
  const generateFakePhone = () => {
    // Generate a random 8-digit number and prefix with 00
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

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `/api/customers?page=${currentPage}&limit=20`;
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch customers");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    setIsSubmitting(true);

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

      const url = editingCustomer
        ? `/api/customers/${editingCustomer._id}`
        : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save customer");
      }

      toast.success(
        editingCustomer
          ? "Customer updated successfully!"
          : "Customer created successfully!"
      );
      resetForm();
      setIsDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      const response = await fetch(`/api/customers/${customerToDelete._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete customer");
      }

      toast.success("Customer deleted successfully!");
      fetchCustomers();
    } catch (error) {
      toast.error(error.message);
    } finally {
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
                    disabled={!!editingCustomer}
                    maxLength={10}
                  />
                  {!editingCustomer && (
                    <p className="text-xs text-muted-foreground">
                      Auto-generated unique fake number (starts with 00)
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
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
                {pagination.totalItems} customer{pagination.totalItems !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
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
                          {customer.creditLimit > 0 && (
                            <div className="text-muted-foreground">
                              Credit Limit: ₹{parseFloat(customer.creditLimit).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {customer.outstandingBalance > 0 && (
                          <div className="text-sm text-red-600">
                            Outstanding: ₹{parseFloat(customer.outstandingBalance).toFixed(2)}
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
            </div>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && customers.length > 0 && (
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
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
