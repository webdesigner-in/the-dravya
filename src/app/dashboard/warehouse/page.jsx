"use client";

import { useState, useEffect, useRef } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Warehouse as WarehouseIcon, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from "@/hooks/useWarehouses";
import { useUsers } from "@/hooks/useUsers";

export default function WarehousePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasShownAccessDenied = useRef(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  
  // React Query hooks with infinite scroll
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useWarehouses({});
  const { data: usersData } = useUsers({});
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  
  // Flatten all pages into single array
  const warehouses = data?.pages?.flatMap(page => page.warehouses) || [];
  const users = usersData?.pages?.flatMap(page => page.users) || [];

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: {
      street: "",
      area: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
    },
    capacity: {
      value: "",
      unit: "cartons",
    },
    manager: "",
    contactNumber: "",
    email: "",
    type: "branch",
    facilities: [],
    operatingHours: {
      open: "",
      close: "",
    },
    notes: "",
  });

  useEffect(() => {
    if (!isAdmin && !hasShownAccessDenied.current) {
      hasShownAccessDenied.current = true;
      router.push("/dashboard");
    }
  }, [isAdmin, router]);

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      
      if (isNearBottom && !isLoading && !isFetchingNextPage && hasNextPage) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: {
        street: "",
        area: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
      },
      capacity: {
        value: "",
        unit: "cartons",
      },
      manager: "",
      contactNumber: "",
      email: "",
      type: "branch",
      facilities: [],
      operatingHours: {
        open: "",
        close: "",
      },
      notes: "",
    });
    setEditingWarehouse(null);
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || {
        street: "",
        area: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
      },
      capacity: warehouse.capacity,
      manager: warehouse.manager?._id || "",
      contactNumber: warehouse.contactNumber || "",
      email: warehouse.email || "",
      type: warehouse.type,
      facilities: warehouse.facilities || [],
      operatingHours: warehouse.operatingHours || { open: "", close: "" },
      notes: warehouse.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingWarehouse) {
        await updateWarehouse.mutateAsync({
          warehouseId: editingWarehouse._id,
          updates: formData,
        });
      } else {
        await createWarehouse.mutateAsync(formData);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error toast shown automatically by hook
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;

    try {
      await deleteWarehouse.mutateAsync(id);
    } catch (error) {
      // Error toast shown automatically by hook
    }
  };

  const toggleFacility = (facility) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations and inventory"
        backHref="/dashboard"
        actions={
          user?.role === "admin" && (
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
                  Add Warehouse
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
                </DialogTitle>
                <DialogDescription>
                  {editingWarehouse
                    ? "Update warehouse information"
                    : "Create a new warehouse location"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Warehouse Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="WH001"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">Main Warehouse</SelectItem>
                          <SelectItem value="branch">Branch</SelectItem>
                          <SelectItem value="distribution-center">
                            Distribution Center
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager">Manager</Label>
                      <Select
                        value={formData.manager}
                        onValueChange={(value) =>
                          setFormData({ ...formData, manager: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter(u => u._id).map((u) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="capacityValue">Capacity *</Label>
                      <Input
                        id="capacityValue"
                        type="number"
                        value={formData.capacity.value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            capacity: {
                              ...formData.capacity,
                              value: e.target.value,
                            },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacityUnit">Unit</Label>
                      <Select
                        value={formData.capacity.unit}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            capacity: { ...formData.capacity, unit: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cartons">Cartons</SelectItem>
                          <SelectItem value="bottles">Bottles</SelectItem>
                          <SelectItem value="sqft">Sq Ft</SelectItem>
                          <SelectItem value="cubic-meter">Cubic Meter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={formData.contactNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contactNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Street"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Area"
                        value={formData.address.area}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, area: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="City"
                        value={formData.address.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, city: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="State"
                        value={formData.address.state}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, state: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Pincode"
                        value={formData.address.pincode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: {
                              ...formData.address,
                              pincode: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Facilities</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "cold-storage",
                        "loading-dock",
                        "parking",
                        "office",
                        "security",
                      ].map((facility) => (
                        <Button
                          key={facility}
                          type="button"
                          variant={
                            formData.facilities.includes(facility)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleFacility(facility)}
                        >
                          {facility.replace("-", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openTime">Opening Time</Label>
                      <Input
                        id="openTime"
                        type="time"
                        value={formData.operatingHours.open}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            operatingHours: {
                              ...formData.operatingHours,
                              open: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closeTime">Closing Time</Label>
                      <Input
                        id="closeTime"
                        type="time"
                        value={formData.operatingHours.close}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            operatingHours: {
                              ...formData.operatingHours,
                              close: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
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
                  <Button type="submit" disabled={createWarehouse.isPending || updateWarehouse.isPending}>
                    {createWarehouse.isPending || updateWarehouse.isPending
                      ? "Saving..."
                      : editingWarehouse
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )
        }
      />

      {/* Warehouses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <WarehouseIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-muted-foreground">No warehouses found</p>
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <Card key={warehouse._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{warehouse.name}</CardTitle>
                    <CardDescription>{warehouse.code}</CardDescription>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded capitalize ${
                      warehouse.type === "main"
                        ? "bg-blue-100 text-blue-700"
                        : warehouse.type === "branch"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {warehouse.type.replace("-", " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Capacity</p>
                  <p className="font-medium">
                    {warehouse.capacity.value} {warehouse.capacity.unit}
                  </p>
                </div>
                {warehouse.manager && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Manager</p>
                    <p className="font-medium">{warehouse.manager.name}</p>
                  </div>
                )}
                {warehouse.address && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {warehouse.address.city}, {warehouse.address.state}
                    </p>
                  </div>
                )}
                {warehouse.operatingHours?.open && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Hours</p>
                    <p className="font-medium">
                      {warehouse.operatingHours.open} -{" "}
                      {warehouse.operatingHours.close}
                    </p>
                  </div>
                )}
                {user?.role === "admin" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(warehouse)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(warehouse._id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        
        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="col-span-full flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading more warehouses...</span>
          </div>
        )}
        
        {/* End of results indicator */}
        {!hasNextPage && warehouses.length > 0 && (
          <div className="col-span-full text-center py-4">
            <p className="text-sm text-muted-foreground">No more warehouses to load</p>
          </div>
        )}
      </div>
    </div>
  );
}
