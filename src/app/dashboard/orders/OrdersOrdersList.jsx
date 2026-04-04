"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, ShoppingCart, Eye, Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorMessages";
import api from "@/lib/apiClient";
import {
  getOrderStatusColorClass,
  getOrderPaymentStatusColorClass,
} from "./orderUiUtils";

export default function OrdersOrdersList({
  orders,
  isLoading,
  error,
  hasNextPage,
  searchQuery,
  isFetchingNextPage,
  formatDate,
  isAdmin,
  isSubmitting,
  setSelectedOrder,
  setIsViewOrderDialogOpen,
  handleStatusChange,
  handlePaymentStatusChange,
  setSelectedInvoice,
  setPaymentAmount,
  setPaymentMethod,
  setPaymentNotes,
  setTransactionId,
  setIsRecordPaymentDialogOpen,
  setIsInvoiceDialogOpen,
  handleDeleteClick,
  invalidateOrders,
  setIsSubmitting,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">All Orders</CardTitle>
        <CardDescription className="text-sm">
          {orders.length > 0 ? (
            <>
              Showing {orders.length} order(s)
              {hasNextPage && !searchQuery && (
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
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load orders</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base md:text-lg font-semibold">{order.orderNumber}</h3>
                        {order.orderType === "guest" && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                            Guest
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded capitalize ${getOrderStatusColorClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded capitalize ${getOrderPaymentStatusColorClass(
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
                            {order.invoice.status === "paid" && (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                                ✓ Invoice Paid
                              </span>
                            )}
                            {order.invoice.status === "partial" && (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">
                                ⚠ Partial Payment
                              </span>
                            )}
                            {(order.invoice.status === "sent" || order.invoice.status === "draft") &&
                              order.invoice.balanceAmount > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                                  ✗ Invoice Unpaid
                                </span>
                              )}
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground block">
                            {order.orderType === "guest" ? "Guest:" : "Customer:"}
                          </span>
                          <p className="font-medium truncate">
                            {order.orderType === "guest"
                              ? order.guestInfo?.name || "Guest Customer"
                              : order.customer?.name}
                          </p>
                          {order.orderType === "guest" && order.guestInfo?.phone && (
                            <p className="text-xs text-muted-foreground">{order.guestInfo.phone}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Total:</span>
                          <p className="font-medium">₹{parseFloat(order.finalAmount).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Paid:</span>
                          <p className="font-medium text-green-600">
                            ₹{parseFloat(order.paidAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Due:</span>
                          <p className="font-medium text-red-600">
                            ₹{(
                              parseFloat(order.finalAmount) - parseFloat(order.paidAmount || 0)
                            ).toFixed(2)}
                          </p>
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
                        {order.invoice && order.invoice._id && (
                          <div className="col-span-2 sm:col-span-3 pt-2 border-t">
                            <span className="text-muted-foreground block text-xs">Invoice Status:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="font-medium text-sm">
                                {order.invoice.invoiceNumber || "N/A"}
                              </p>
                              <Badge
                                className={`text-xs ${
                                  order.invoice.status === "paid"
                                    ? "bg-green-100 text-green-700"
                                    : order.invoice.status === "partial"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {order.invoice.status === "paid"
                                  ? "Paid"
                                  : order.invoice.status === "partial"
                                    ? "Partial"
                                    : "Unpaid"}
                              </Badge>
                              {order.invoice.paymentHistory &&
                                order.invoice.paymentHistory.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({order.invoice.paymentHistory.length} payment
                                    {order.invoice.paymentHistory.length > 1 ? "s" : ""})
                                  </span>
                                )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t">
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

                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order._id, value)}
                          disabled={!!order.invoice?._id}
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
                          onValueChange={(value) => handlePaymentStatusChange(order, value)}
                          disabled={!!order.invoice?._id}
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
                            {order.invoice.status !== "paid" && order.invoice.balanceAmount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(order.invoice);
                                  setSelectedOrder(order);
                                  setPaymentAmount("");
                                  setPaymentMethod("cash");
                                  setPaymentNotes("");
                                  setTransactionId("");
                                  setIsRecordPaymentDialogOpen(true);
                                }}
                                className="text-xs h-8 border-green-500 text-green-600 hover:bg-green-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Payment
                              </Button>
                            )}
                            {isAdmin &&
                              order.invoice.paidAmount > 0 &&
                              order.invoice.status !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        `Reset all payments on invoice ${order.invoice.invoiceNumber}?\n\nThis will mark the invoice as unpaid and create a reversal record.`
                                      )
                                    )
                                      return;
                                    setIsSubmitting(true);
                                    try {
                                      await api.post(
                                        `/api/invoices/${order.invoice._id}/reset-payments`
                                      );
                                      invalidateOrders();
                                      toast.success("Payments reset successfully");
                                    } catch (err) {
                                      toast.error(getUserFriendlyError(err));
                                    } finally {
                                      setIsSubmitting(false);
                                    }
                                  }}
                                  disabled={isSubmitting}
                                  className="text-xs h-8 border-orange-400 text-orange-600 hover:bg-orange-50"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset
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

                        {order.status === "cancelled" && isAdmin && (
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

            {isFetchingNextPage && (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <p className="text-sm text-muted-foreground">Loading more orders...</p>
              </div>
            )}

            {!hasNextPage && orders.length > 0 && !searchQuery && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  You&apos;ve reached the end of all orders
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
