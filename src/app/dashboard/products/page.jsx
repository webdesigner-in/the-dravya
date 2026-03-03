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
import { Plus, Pencil, Trash2, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

export default function ProductsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasShownAccessDenied = React.useRef(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "bottle",
    sizeValue: "",
    sizeUnit: "liter",
    bottlesPerCarton: "",
    price: "",
    costPrice: "",
    sku: "",
    barcode: "",
    stock: "0",
    minStockLevel: "10",
  });

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin && !hasShownAccessDenied.current) {
      hasShownAccessDenied.current = true;
      router.push("/dashboard");
      toast.error("Access denied. Products management is only accessible to administrators.");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin && productsLoaded) {
      fetchProducts();
    }
  }, [isAdmin, productsLoaded]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "bottle",
      sizeValue: "",
      sizeUnit: "liter",
      bottlesPerCarton: "",
      price: "",
      costPrice: "",
      sku: "",
      barcode: "",
      stock: "0",
      minStockLevel: "10",
    });
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      sizeValue: product.size.value.toString(),
      sizeUnit: product.size.unit,
      bottlesPerCarton: product.bottlesPerCarton ? product.bottlesPerCarton.toString() : "1",
      price: product.price.toString(),
      costPrice: product.costPrice.toString(),
      sku: product.sku,
      barcode: product.barcode || "",
      stock: product.stock.toString(),
      minStockLevel: product.minStockLevel.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        size: {
          value: parseFloat(formData.sizeValue),
          unit: formData.sizeUnit,
        },
        bottlesPerCarton: parseInt(formData.bottlesPerCarton),
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice),
        sku: formData.sku,
        barcode: formData.barcode,
        stock: parseInt(formData.stock),
        minStockLevel: parseInt(formData.minStockLevel),
      };

      const url = editingProduct
        ? `/api/products/${editingProduct._id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      toast.success(
        editingProduct ? "Product updated successfully!" : "Product created successfully!"
      );
      resetForm();
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete product");
      }

      toast.success("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Prevent rendering for non-admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage water products and pricing"
        backHref="/dashboard"
        actions={
          isAdmin && (
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
                  Add Product
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Update product details"
                    : "Add a new water product to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., 20L Water Bottle"
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Product description"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
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
                        <SelectItem value="bottle">Bottle</SelectItem>
                        <SelectItem value="jar">Jar</SelectItem>
                        <SelectItem value="can">Can</SelectItem>
                        <SelectItem value="dispenser">Dispenser</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Size *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.sizeValue}
                        onChange={(e) =>
                          setFormData({ ...formData, sizeValue: e.target.value })
                        }
                        placeholder="20"
                        required
                        step="0.01"
                      />
                      <Select
                        value={formData.sizeUnit}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sizeUnit: value })
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="liter">Liter</SelectItem>
                          <SelectItem value="gallon">Gallon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bottlesPerCarton">Bottles per Carton *</Label>
                    <Input
                      id="bottlesPerCarton"
                      type="number"
                      value={formData.bottlesPerCarton}
                      onChange={(e) =>
                        setFormData({ ...formData, bottlesPerCarton: e.target.value })
                      }
                      placeholder="e.g., 12 for 1L, 24 for 500ml"
                      required
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Selling Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="50"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price (₹) *</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      placeholder="30"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      placeholder="WB-20L-001"
                      required
                      disabled={!!editingProduct}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                      placeholder="1234567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Initial Stock (Cartons)</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minStockLevel">Min Stock Level (Cartons)</Label>
                    <Input
                      id="minStockLevel"
                      type="number"
                      value={formData.minStockLevel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStockLevel: e.target.value,
                        })
                      }
                      placeholder="10"
                      min="0"
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
                      : editingProduct
                      ? "Update Product"
                      : "Create Product"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            {productsLoaded ? "View and manage your water product inventory" : "Click 'Load Products' to view products"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!productsLoaded ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Products Not Loaded</p>
              <p className="text-muted-foreground mb-6">
                Click the button below to load products data
              </p>
              <Button onClick={() => setProductsLoaded(true)} size="lg">
                <Package className="mr-2 h-5 w-5" />
                Load Products
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">No products found</p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Click "Add Product" to create your first product
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card key={product._id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {product.size.value} {product.size.unit}
                          {product.bottlesPerCarton && ` • ${product.bottlesPerCarton} bottles/carton`}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(product)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="font-medium">{product.sku}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">₹{parseFloat(product.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stock:</span>
                        <span
                          className={`font-medium ${
                            product.stock <= product.minStockLevel
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {product.stock} cartons
                          {product.stock <= product.minStockLevel && (
                            <AlertTriangle className="inline h-3 w-3 ml-1" />
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium capitalize">
                          {product.category}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              This will permanently delete the product{" "}
              <span className="font-semibold">{productToDelete?.name}</span>.
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
