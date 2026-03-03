"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Download, Share2, Printer } from "lucide-react";
import { toast } from "sonner";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
      } else {
        toast.error("Invoice not found");
        router.push("/dashboard/invoices");
      }
    } catch (error) {
      toast.error("Failed to fetch invoice");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
    // Check for phone number in customer or guest info
    const hasPhone = invoice?.customer?.phone || invoice?.guestInfo?.phone;
    
    if (!hasPhone) {
      toast.error("Phone number not available for this invoice");
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${params.id}/whatsapp`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to generate WhatsApp link");

      const data = await response.json();
      window.open(data.whatsappUrl, "_blank");
      toast.success("Opening WhatsApp...");
    } catch (error) {
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
          <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
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
      <Card ref={printRef} className="w-full mx-auto">
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
              <h2 className="text-lg sm:text-xl font-bold">DRAVYA</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Water Distribution</p>
              <p className="text-xs sm:text-sm text-muted-foreground">DD Nagar Shatabdi Puram</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Gwalior - 474020</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Phone: +91 8349692297</p>
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
            <table className="w-full min-w-[500px]">
              <thead className="border-b-2">
                <tr className="text-left">
                  <th className="pb-2 px-2 sm:px-0 text-xs sm:text-sm">Item</th>
                  <th className="pb-2 text-center text-xs sm:text-sm">Qty</th>
                  <th className="pb-2 text-right text-xs sm:text-sm">Price</th>
                  <th className="pb-2 text-right px-2 sm:px-0 text-xs sm:text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-2 sm:px-0">
                      <p className="font-medium text-xs sm:text-sm">{item.description || item.product?.name}</p>
                      {item.product?.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                      )}
                    </td>
                    <td className="py-3 text-center text-xs sm:text-sm">{item.quantity} cartons</td>
                    <td className="py-3 text-right text-xs sm:text-sm">₹{item.price.toFixed(2)}</td>
                    <td className="py-3 text-right px-2 sm:px-0 text-xs sm:text-sm">₹{item.subtotal.toFixed(2)}</td>
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
