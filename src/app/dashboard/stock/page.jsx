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
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Package,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useStockMovements, useCreateStockMovement } from "@/hooks/useStock";
import { useProducts } from "@/hooks/useProducts";

export default function StockPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasShownAccessDenied = useRef(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // React Query hooks with infinite scroll
  const { data: productsData } = useProducts({});
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useStockMovements({});
  const createStockMovement = useCreateStockMovement();
  
  const products = productsData?.products || [];
  // Flatten all pages into single array
  const movements = data?.pages?.flatMap(page => page.movements) || [];

  const [formData, setFormData] = useState({
    product: "",
    type: "in",
    quantity: "",
    reason: "",
    reference: "",
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
      product: "",
      type: "in",
      quantity: "",
      reason: "",
      reference: "",
      notes: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        product: formData.product,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        reference: formData.reference,
        notes: formData.notes,
      };

      await createStockMovement.mutateAsync(payload);
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error toast shown automatically by hook
    }
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case "in":
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />;
      case "out":
        return <ArrowUpCircle className="h-5 w-5 text-red-600" />;
      case "adjustment":
        return <RefreshCw className="h-5 w-5 text-blue-600" />;
      case "damage":
        return <Package className="h-5 w-5 text-orange-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMovementColor = (type) => {
    switch (type) {
      case "in":
        return "text-green-600";
      case "out":
        return "text-red-600";
      case "adjustment":
        return "text-blue-600";
      case "damage":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Management"
        description="Track and manage inventory movements"
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
                Record Movement
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Stock Movement</DialogTitle>
              <DialogDescription>
                Add or remove stock from inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product}
                    onValueChange={(value) =>
                      setFormData({ ...formData, product: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} ({product.sku}) - {product.stock} cartons
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Movement Type *</Label>
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
                      <SelectItem value="in">Stock In</SelectItem>
                      <SelectItem value="out">Stock Out</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="damage">Damage</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (Cartons) *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="Enter quantity in cartons"
                    required
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="e.g., New purchase, Sale, Damaged goods"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference Number</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                    placeholder="Invoice/PO number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
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
                <Button type="submit" disabled={createStockMovement.isPending}>
                  {createStockMovement.isPending ? "Recording..." : "Record Movement"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Current Stock Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <Card key={product._id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {product.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.stock}</div>
              <p className="text-xs text-muted-foreground">
                cartons (Min: {product.minStockLevel})
              </p>
              {product.stock <= product.minStockLevel && (
                <p className="text-xs text-red-600 mt-1">Low stock!</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
          <CardDescription>
            Latest inventory transactions and adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-muted-foreground">
                No stock movements recorded
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div
                  key={movement._id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getMovementIcon(movement.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {movement.product?.name || "Unknown Product"}
                        </p>
                        <span
                          className={`text-sm font-semibold ${getMovementColor(
                            movement.type
                          )}`}
                        >
                          {movement.type === "in" ? "+" : "-"}
                          {movement.quantity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {movement.reason}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>SKU: {movement.product?.sku}</span>
                        {movement.reference && (
                          <span>Ref: {movement.reference}</span>
                        )}
                        <span>
                          By: {movement.performedBy?.name || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(movement.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(movement.createdAt).toLocaleTimeString()}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-gray-100 capitalize">
                      {movement.type}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Loading more indicator */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading more movements...</span>
                </div>
              )}
              
              {/* End of results indicator */}
              {!hasNextPage && movements.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No more movements to load</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
