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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Truck, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

export default function TransportPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasShownAccessDenied = useRef(false);
  const [vehicles, setVehicles] = useState([]);
  const [allLoadedVehicles, setAllLoadedVehicles] = useState([]); // Cache all loaded vehicles
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Loading more vehicles
  const [hasMoreVehicles, setHasMoreVehicles] = useState(true); // Track if more vehicles available
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "van",
    brand: "",
    model: "",
    capacity: {
      value: "",
      unit: "cartons",
    },
    driver: "",
    status: "available",
    fuelType: "diesel",
    registrationDate: "",
    insuranceExpiry: "",
    lastServiceDate: "",
    nextServiceDate: "",
    mileage: "",
    notes: "",
  });

  useEffect(() => {
    if (!isAdmin && !hasShownAccessDenied.current) {
      hasShownAccessDenied.current = true;
      router.push("/dashboard");
      toast.error("Access denied. Transport management is only accessible to administrators.");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchVehicles();
      fetchUsers();
    }
  }, [isAdmin]);

  // Infinite scroll implementation for vehicles
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      
      if (isNearBottom && !isLoading && !isLoadingMore && hasMoreVehicles) {
        loadMoreVehicles();
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
  }, [isLoading, isLoadingMore, hasMoreVehicles]);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vehicles?page=1&limit=20");
      if (response.ok) {
        const data = await response.json();
        const vehicleData = data.vehicles || [];
        setVehicles(vehicleData);
        setAllLoadedVehicles(vehicleData);
        
        // Check if there are more vehicles to load
        if (vehicleData.length < 20) {
          setHasMoreVehicles(false);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch vehicles");
    } finally {
      setIsLoading(false);
    }
  };

  // Load more vehicles function
  const loadMoreVehicles = async () => {
    if (isLoadingMore || !hasMoreVehicles) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = Math.floor(allLoadedVehicles.length / 20) + 1;
      const response = await fetch(`/api/vehicles?page=${nextPage}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        const newVehicles = data.vehicles || [];
        
        if (newVehicles.length === 0) {
          setHasMoreVehicles(false);
        } else {
          setAllLoadedVehicles(prev => [...prev, ...newVehicles]);
          setVehicles(prev => [...prev, ...newVehicles]);
          
          if (newVehicles.length < 20) {
            setHasMoreVehicles(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load more vehicles:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      // Error already logged by logger
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      vehicleType: "van",
      brand: "",
      model: "",
      capacity: {
        value: "",
        unit: "cartons",
      },
      driver: "",
      status: "available",
      fuelType: "diesel",
      registrationDate: "",
      insuranceExpiry: "",
      lastServiceDate: "",
      nextServiceDate: "",
      mileage: "",
      notes: "",
    });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      capacity: vehicle.capacity,
      driver: vehicle.driver?._id || "",
      status: vehicle.status,
      fuelType: vehicle.fuelType || "diesel",
      registrationDate: vehicle.registrationDate
        ? new Date(vehicle.registrationDate).toISOString().split("T")[0]
        : "",
      insuranceExpiry: vehicle.insuranceExpiry
        ? new Date(vehicle.insuranceExpiry).toISOString().split("T")[0]
        : "",
      lastServiceDate: vehicle.lastServiceDate
        ? new Date(vehicle.lastServiceDate).toISOString().split("T")[0]
        : "",
      nextServiceDate: vehicle.nextServiceDate
        ? new Date(vehicle.nextServiceDate).toISOString().split("T")[0]
        : "",
      mileage: vehicle.mileage?.toString() || "",
      notes: vehicle.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingVehicle
        ? `/api/vehicles/${editingVehicle._id}`
        : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save vehicle");
      }

      toast.success(
        `Vehicle ${editingVehicle ? "updated" : "added"} successfully!`
      );
      resetForm();
      setIsDialogOpen(false);
      fetchVehicles();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete vehicle");
      }

      toast.success("Vehicle deleted successfully!");
      fetchVehicles();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: "bg-green-100 text-green-700",
      "in-use": "bg-blue-100 text-blue-700",
      maintenance: "bg-yellow-100 text-yellow-700",
      inactive: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Management"
        description="Manage vehicles and delivery routes"
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
                  Add Vehicle
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                </DialogTitle>
                <DialogDescription>
                  {editingVehicle
                    ? "Update vehicle information"
                    : "Register a new vehicle"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                      <Input
                        id="vehicleNumber"
                        value={formData.vehicleNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicleNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="MH12AB1234"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Type *</Label>
                      <Select
                        value={formData.vehicleType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, vehicleType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bike">Bike</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="tempo">Tempo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData({ ...formData, brand: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                      />
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
                          <SelectItem value="kg">KG</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="driver">Driver</Label>
                      <Select
                        value={formData.driver}
                        onValueChange={(value) =>
                          setFormData({ ...formData, driver: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
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
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
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
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in-use">In Use</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuelType">Fuel Type</Label>
                      <Select
                        value={formData.fuelType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, fuelType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="petrol">Petrol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="cng">CNG</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Mileage (km)</Label>
                      <Input
                        id="mileage"
                        type="number"
                        value={formData.mileage}
                        onChange={(e) =>
                          setFormData({ ...formData, mileage: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registrationDate">Registration Date</Label>
                      <Input
                        id="registrationDate"
                        type="date"
                        value={formData.registrationDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registrationDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                      <Input
                        id="insuranceExpiry"
                        type="date"
                        value={formData.insuranceExpiry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            insuranceExpiry: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastServiceDate">Last Service</Label>
                      <Input
                        id="lastServiceDate"
                        type="date"
                        value={formData.lastServiceDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lastServiceDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nextServiceDate">Next Service</Label>
                      <Input
                        id="nextServiceDate"
                        type="date"
                        value={formData.nextServiceDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nextServiceDate: e.target.value,
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Saving..."
                      : editingVehicle
                      ? "Update"
                      : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )
        }
      />

      {/* Vehicles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-muted-foreground">No vehicles found</p>
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <Card key={vehicle._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{vehicle.vehicleNumber}</CardTitle>
                    <CardDescription className="capitalize">
                      {vehicle.vehicleType}
                      {vehicle.brand && ` - ${vehicle.brand}`}
                    </CardDescription>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(
                      vehicle.status
                    )}`}
                  >
                    {vehicle.status.replace("-", " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Capacity</p>
                  <p className="font-medium">
                    {vehicle.capacity.value} {vehicle.capacity.unit}
                  </p>
                </div>
                {vehicle.driver && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Driver</p>
                    <p className="font-medium">{vehicle.driver.name}</p>
                  </div>
                )}
                {vehicle.fuelType && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Fuel</p>
                    <p className="font-medium capitalize">{vehicle.fuelType}</p>
                  </div>
                )}
                {vehicle.insuranceExpiry && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Insurance Expiry</p>
                    <p className="font-medium">
                      {new Date(vehicle.insuranceExpiry).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {user?.role === "admin" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(vehicle)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(vehicle._id)}
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
        {isLoadingMore && (
          <div className="col-span-full flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading more vehicles...</span>
          </div>
        )}
        
        {/* End of results indicator */}
        {!isLoading && !isLoadingMore && !hasMoreVehicles && vehicles.length > 0 && (
          <div className="col-span-full text-center py-4">
            <p className="text-sm text-muted-foreground">No more vehicles to load</p>
          </div>
        )}
      </div>
    </div>
  );
}
