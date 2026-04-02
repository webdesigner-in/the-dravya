"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const data = await api.get(`/api/invoices/${params.id}`);
      setInvoice(data.invoice);
    } catch {
      toast.error("Invoice not found");
      router.push("/dashboard/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Open PDF in new window where user can print or save
      window.open(`/api/invoices/${params.id}/pdf`, '_blank');
      toast.success("Opening invoice PDF...");
    } catch (error) {
      toast.error("Failed to open PDF");
    }
  };

  const handleShareWhatsApp = async () => {
    const hasPhone = invoice?.customer?.phone || invoice?.guestInfo?.phone;
    if (!hasPhone) { toast.error("Phone number not available for this invoice"); return; }
    try {
      const data = await api.post(`/api/invoices/${params.id}/whatsapp`);
      window.open(data.whatsappUrl, "_blank");
      toast.success("Opening WhatsApp...");
    } catch {
      toast.error("Failed to share on WhatsApp");
    }
  };



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Action Bar - Hidden in print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
          <Button onClick={handleShareWhatsApp} className="flex-1 sm:flex-none">
            <Share2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Share on WhatsApp</span>
            <span className="sm:hidden">Share</span>
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <Card className="w-full mx-auto">
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full sm:w-auto">
              <CardTitle className="text-2xl sm:text-3xl mb-2">INVOICE</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Invoice Number: <span className="font-semibold">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Order Number: <span className="font-semibold">{invoice.order?.orderNumber}</span>
              </p>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <h2 className="text-lg sm:text-xl font-bold">{process.env.NEXT_PUBLIC_BUSINESS_NAME}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{process.env.NEXT_PUBLIC_BUSINESS_TAGLINE}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{process.env.NEXT_PUBLIC_BUSINESS_ADDRESS}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{process.env.NEXT_PUBLIC_BUSINESS_CITY}{process.env.NEXT_PUBLIC_BUSINESS_PINCODE ? ` - ${process.env.NEXT_PUBLIC_BUSINESS_PINCODE}` : ''}</p>
              {process.env.NEXT_PUBLIC_BUSINESS_PHONE && <p className="text-xs sm:text-sm text-muted-foreground">Phone: {process.env.NEXT_PUBLIC_BUSINESS_PHONE}</p>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Dates and Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Bill To:</h3>
              {invoice.customer ? (
                <>
                  <p className="font-medium text-sm sm:text-base">{invoice.customer.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{invoice.customer.phone}</p>
                  {invoice.customer.email && (
                    <p className="text-xs sm:text-sm text-muted-foreground">{invoice.customer.email}</p>
                  )}
                  {invoice.customer.address && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      <p>{invoice.customer.address.street}</p>
                      <p>{invoice.customer.address.area}</p>
                      <p>
                        {invoice.customer.address.city}, {invoice.customer.address.state} -{" "}
                        {invoice.customer.address.pincode}
                      </p>
                    </div>
                  )}
                </>
              ) : invoice.guestInfo ? (
                <>
                  <p className="font-medium text-sm sm:text-base">{invoice.guestInfo.name}</p>
                  {invoice.guestInfo.phone && (
                    <p className="text-xs sm:text-sm text-muted-foreground">{invoice.guestInfo.phone}</p>
                  )}
                  {invoice.guestInfo.address && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{invoice.guestInfo.address}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 italic">(Guest Customer)</p>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">Customer information not available</p>
              )}
            </div>
            <div className="sm:text-right">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Issue Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Due Date:</span>{" "}
                  <span className="font-medium">
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A (Paid in Full)"}
                  </span>
                </p>
                <p className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Payment Terms:</span>{" "}
                  <span className="font-medium">{invoice.paymentTerms}</span>
                </p>
                <p className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="font-medium capitalize">{invoice.status}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-150 border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="pb-3 px-2 sm:px-4 text-left text-sm font-semibold text-gray-700">
                    ITEM DESCRIPTION
                  </th>
                  <th className="pb-3 px-2 text-center text-sm font-semibold text-gray-700">
                    QTY
                  </th>
                  <th className="pb-3 px-2 text-right text-sm font-semibold text-gray-700">
                    UNIT PRICE
                  </th>
                  <th className="pb-3 px-2 sm:px-4 text-right text-sm font-semibold text-gray-700">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-2 sm:px-4">
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {item.description || item.product?.name}
                        </p>
                        {item.product?.sku && (
                          <p className="text-xs text-gray-500 mt-1">
                            SKU: {item.product.sku}
                          </p>
                        )}
                        {item.product?.size && (
                          <p className="text-xs text-gray-500">
                            Size: {item.product.size.value}{item.product.size.unit}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                        {item.quantity} cartons
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="space-y-1">
                        {(() => {
                          // For new invoices with originalPrice data
                          if (item.originalPrice && item.originalPrice > item.price) {
                            return (
                              <>
                                <div className="text-xs text-gray-500 line-through">
                                  ₹{item.originalPrice.toFixed(2)}
                                </div>
                                <div className="text-sm font-semibold text-green-600">
                                  ₹{item.price.toFixed(2)}
                                </div>
                                {item.discountPercentage > 0 && (
                                  <div className="text-xs text-green-600 font-medium">
                                    {item.discountPercentage}% OFF
                                  </div>
                                )}
                              </>
                            );
                          }
                          
                          // For existing invoices, use product price as original if there's a discount
                          if (invoice.discount > 0 && item.product?.price && item.product.price > item.price) {
                            const originalPrice = item.product.price;
                            const discountPercentage = Math.round(((originalPrice - item.price) / originalPrice) * 100);
                            
                            return (
                              <>
                                <div className="text-xs text-gray-500 line-through">
                                  ₹{originalPrice.toFixed(2)}
                                </div>
                                <div className="text-sm font-semibold text-green-600">
                                  ₹{item.price.toFixed(2)}
                                </div>
                                {discountPercentage > 0 && (
                                  <div className="text-xs text-green-600 font-medium">
                                    {discountPercentage}% OFF
                                  </div>
                                )}
                              </>
                            );
                          }
                          
                          // Default display for no discount
                          return (
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{item.price.toFixed(2)}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-4 px-2 sm:px-4 text-right">
                      <div className="space-y-1">
                        {(() => {
                          // For new invoices with originalPrice data
                          if (item.originalPrice && item.originalPrice > item.price) {
                            return (
                              <>
                                <div className="text-xs text-gray-500 line-through">
                                  ₹{(item.originalPrice * item.quantity).toFixed(2)}
                                </div>
                                <div className="text-sm font-bold text-gray-900">
                                  ₹{item.subtotal.toFixed(2)}
                                </div>
                                <div className="text-xs text-green-600 font-medium">
                                  You Save: ₹{((item.originalPrice - item.price) * item.quantity).toFixed(2)}
                                </div>
                              </>
                            );
                          }
                          
                          // For existing invoices, use product price as original if there's a discount
                          if (invoice.discount > 0 && item.product?.price && item.product.price > item.price) {
                            const originalPrice = item.product.price;
                            const originalTotal = originalPrice * item.quantity;
                            const savings = (originalPrice - item.price) * item.quantity;
                            
                            return (
                              <>
                                <div className="text-xs text-gray-500 line-through">
                                  ₹{originalTotal.toFixed(2)}
                                </div>
                                <div className="text-sm font-bold text-gray-900">
                                  ₹{item.subtotal.toFixed(2)}
                                </div>
                                <div className="text-xs text-green-600 font-medium">
                                  You Save: ₹{savings.toFixed(2)}
                                </div>
                              </>
                            );
                          }
                          
                          // Default display for no discount
                          return (
                            <div className="text-sm font-bold text-gray-900">
                              ₹{item.subtotal.toFixed(2)}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end px-2 sm:px-0">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-xs sm:text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-₹{invoice.discount.toFixed(2)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>₹{invoice.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base sm:text-lg border-t pt-2">
                <span>Total:</span>
                <span>₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Paid:</span>
                  <span>₹{invoice.paidAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.balanceAmount > 0 && (
                <div className="flex justify-between font-semibold text-red-600 text-xs sm:text-sm">
                  <span>Balance Due:</span>
                  <span>₹{invoice.balanceAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="space-y-4 pt-4 border-t px-2 sm:px-0">
              {invoice.notes && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm sm:text-base">Notes:</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm sm:text-base">Terms & Conditions:</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs sm:text-sm text-muted-foreground pt-4 border-t">
            <p>Thank you for your business!</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
