"use client";

import { useState, useRef } from "react";
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
import { Plus, Pencil, Trash2, Package, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useEffect } from "react";
import api from "@/lib/apiClient";

export default function ProductsPage() {
  const router = useRouter();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasShownAccessDenied = useRef(false);
  
  // React Query hooks with infinite scroll
  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useProducts({});
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  // Flatten all pages into single array
  const products = data?.pages?.flatMap(page => page.products) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Cost history state
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [costHistoryProduct, setCostHistoryProduct] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [costHistoryLoading, setCostHistoryLoading] = useState(false);
  const [costForm, setCostForm] = useState({ costPrice: "", sellingPrice: "", effectiveFrom: "", notes: "" });
  const [savingCost, setSavingCost] = useState(false);

  const openCostHistory = async (product) => {
    setCostHistoryProduct(product);
    setCostForm({
      costPrice:    product.costPrice?.toString() || "",
      sellingPrice: product.price?.toString()     || "",
      effectiveFrom: new Date().toISOString().slice(0, 7), // YYYY-MM
      notes: "",
    });
    setIsCostDialogOpen(true);
    setCostHistoryLoading(true);
    try {
      const data = await api.get(`/api/products/${product._id}/price-history`);
      setCostHistory(data.history || []);
    } catch {
      toast.error("Failed to load price history");
    } finally {
      setCostHistoryLoading(false);
    }
  };

  const handleDeleteCostEntry = async (historyId) => {
    if (!confirm("Delete this price entry?")) return;
    try {
      await api.delete(`/api/products/${costHistoryProduct._id}/price-history/${historyId}`);
      setCostHistory(prev => prev.filter(h => h._id !== historyId));
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSaveCost = async (e) => {
    e.preventDefault();
    if (!costForm.costPrice || !costForm.sellingPrice || !costForm.effectiveFrom) {
      toast.error("Please fill all required fields");
      return;
    }
    setSavingCost(true);
    try {
      // Use Date.UTC to avoid timezone offset converting March to February
      const [yr, mo] = costForm.effectiveFrom.split("-");
      const effectiveFrom = new Date(Date.UTC(parseInt(yr), parseInt(mo) - 1, 1)).toISOString();
      await api.post(`/api/products/${costHistoryProduct._id}/price-history`, {
        costPrice:    parseFloat(costForm.costPrice),
        sellingPrice: parseFloat(costForm.sellingPrice),
        effectiveFrom,
        notes: costForm.notes,
      });
      toast.success("Cost price recorded");
      // Refresh history
      const data = await api.get(`/api/products/${costHistoryProduct._id}/price-history`);
      setCostHistory(data.history || []);
      setCostForm(prev => ({ ...prev, notes: "" }));
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingCost(false);
    }
  };

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

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin && !hasShownAccessDenied.current) {
      hasShownAccessDenied.current = true;
      router.push("/dashboard");
      toast.error("Access denied. Products management is only accessible to administrators.");
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

      if (editingProduct) {
        await updateProduct.mutateAsync({
          productId: editingProduct._id,
          updates: payload,
        });
      } else {
        await createProduct.mutateAsync(payload);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error toast is shown automatically by the hook
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct.mutateAsync(productToDelete._id);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      // Error toast is shown automatically by the hook
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
                  <Button 
                    type="submit" 
                    disabled={createProduct.isPending || updateProduct.isPending}
                  >
                    {createProduct.isPending || updateProduct.isPending
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
            View and manage your water product inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load products</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
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
                            title="Cost Price History"
                            onClick={() => openCostHistory(product)}
                          >
                            <History className="h-4 w-4 text-blue-600" />
                          </Button>
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
              
              {/* Loading more indicator */}
              {isFetchingNextPage && (
                <div className="col-span-full flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading more products...</span>
                </div>
              )}
              
              {/* End of results indicator */}
              {!hasNextPage && products.length > 0 && (
                <div className="col-span-full text-center py-4">
                  <p className="text-sm text-muted-foreground">No more products to load</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Price History Dialog */}
      <Dialog open={isCostDialogOpen} onOpenChange={setIsCostDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Cost Price History — {costHistoryProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Record the purchase cost and catalog selling price for a specific month.
              The profit analysis uses this to calculate your actual profit per month.
            </DialogDescription>
          </DialogHeader>

          {/* Add new entry form */}
          <form onSubmit={handleSaveCost} className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium text-sm">Record Price for a Month</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Month *</Label>
                <Input
                  type="month"
                  value={costForm.effectiveFrom}
                  onChange={e => {
                    const selectedMonth = e.target.value; // YYYY-MM
                    // Find existing entry for this month
                    const existing = costHistory.find(h => {
                      const d = new Date(h.effectiveFrom);
                      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                      return key === selectedMonth;
                    });
                    setCostForm(p => ({
                      ...p,
                      effectiveFrom: selectedMonth,
                      costPrice:    existing ? existing.costPrice.toString()    : p.costPrice,
                      sellingPrice: existing ? existing.sellingPrice.toString() : p.sellingPrice,
                      notes:        existing ? (existing.notes || '')           : '',
                    }));
                  }}
                  required
                />
                <p className="text-[10px] text-muted-foreground">Which month this cost applies to</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Purchase Cost (₹/carton) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 65"
                  value={costForm.costPrice}
                  onChange={e => setCostForm(p => ({ ...p, costPrice: e.target.value }))}
                  required
                />
                <p className="text-[10px] text-muted-foreground">What you paid to buy each carton</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catalog / Maximum Price (₹/carton) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 100"
                  value={costForm.sellingPrice}
                  onChange={e => setCostForm(p => ({ ...p, sellingPrice: e.target.value }))}
                  required
                />
                <p className="text-[10px] text-muted-foreground">Maximum/MRP price shown on receipts (actual selling price is recorded per order)</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="e.g. Price hike due to season"
                  value={costForm.notes}
                  onChange={e => setCostForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            {costForm.costPrice && costForm.sellingPrice && (
              <div className="text-xs text-muted-foreground bg-green-50 border border-green-200 rounded p-2">
                Catalog margin: ₹{(parseFloat(costForm.sellingPrice || 0) - parseFloat(costForm.costPrice || 0)).toFixed(2)}/carton
                ({parseFloat(costForm.sellingPrice) > 0
                  ? (((parseFloat(costForm.sellingPrice) - parseFloat(costForm.costPrice)) / parseFloat(costForm.sellingPrice)) * 100).toFixed(1)
                  : 0}%)
              </div>
            )}
            <Button type="submit" size="sm" disabled={savingCost}>
              {savingCost ? "Saving..." : "Save Price Entry"}
            </Button>
          </form>

          {/* History table */}
          <div>
            <h4 className="font-medium text-sm mb-2">Price History</h4>
            {costHistoryLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
              </div>
            ) : costHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No price history recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 px-2 text-xs">Month</th>
                      <th className="pb-2 px-2 text-xs text-right">Cost</th>
                      <th className="pb-2 px-2 text-xs text-right">Catalog/Max Price</th>
                      <th className="pb-2 px-2 text-xs text-right">Margin</th>
                      <th className="pb-2 px-2 text-xs">Notes</th>
                      <th className="pb-2 px-2 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {costHistory.map((h) => {
                      const margin = h.sellingPrice > 0
                        ? (((h.sellingPrice - h.costPrice) / h.sellingPrice) * 100).toFixed(1)
                        : 0;
                      return (
                        <tr key={h._id} className="hover:bg-muted/50">
                          <td className="py-2 px-2 font-medium">
                            {new Date(h.effectiveFrom).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-2 text-right text-red-600">₹{h.costPrice}</td>
                          <td className="py-2 px-2 text-right text-blue-600">₹{h.sellingPrice}</td>
                          <td className="py-2 px-2 text-right text-green-600">
                            ₹{(h.sellingPrice - h.costPrice).toFixed(2)} ({margin}%)
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">{h.notes || "—"}</td>
                          <td className="py-2 px-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteCostEntry(h._id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
