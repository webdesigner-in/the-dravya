import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// GET generate PDF
export async function GET(request, { params }) {
  let authUser;
  try {
    authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const invoice = await Invoice.findById(id)
      .populate('customer', 'name phone email address')
      .populate('order', 'orderNumber')
      .populate('items.product', 'name sku');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Generate simple HTML for PDF
    const html = generateInvoiceHTML(invoice);

    // Return HTML that can be printed as PDF using browser's print function
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

function generateInvoiceHTML(invoice) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .company-info {
      text-align: right;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .bill-to {
      width: 45%;
    }
    .invoice-details {
      width: 45%;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background-color: #f0f0f0;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #333;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row {
      font-size: 18px;
      font-weight: bold;
      border-top: 2px solid #333;
      padding-top: 10px;
    }
    .balance-due {
      color: #dc2626;
      font-weight: bold;
    }
    .paid-stamp {
      color: #16a34a;
      font-weight: bold;
      font-size: 24px;
      text-align: center;
      margin: 20px 0;
      padding: 10px;
      border: 3px solid #16a34a;
      display: inline-block;
      transform: rotate(-15deg);
    }
    .notes {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #333;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      z-index: 1000;
    }
    .print-button:hover {
      background-color: #555;
    }
    .print-button:active {
      background-color: #222;
    }
    @media print {
      .print-button {
        display: none;
      }
    }
    /* iOS Safari specific fixes */
    @supports (-webkit-touch-callout: none) {
      .print-button {
        -webkit-appearance: none;
        -webkit-tap-highlight-color: transparent;
      }
    }
  </style>
  <script>
    function printOrDownload() {
      // For iOS devices, show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert('To save as PDF on iPhone/iPad:\\n1. Tap the Share button\\n2. Select "Print"\\n3. Pinch to zoom on the preview\\n4. Tap Share again and select "Save to Files"');
      }
      window.print();
    }
  </script>
</head>
<body>
  <button class="print-button" onclick="printOrDownload()">🖨️ Print / Save as PDF</button>
  
  <div class="header">
    <div>
      <div class="invoice-title">INVOICE</div>
      <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Order Number:</strong> ${invoice.order?.orderNumber || 'N/A'}</p>
    </div>
    <div class="company-info">
      <h2>DRAVYA</h2>
      <p>Water Distribution</p>
      <p>DD Nagar Shatabdi Puram</p>
      <p>Gwalior - 474020</p>
      <p>Phone: +91 8349692297</p>
    </div>
  </div>

  <div class="info-section">
    <div class="bill-to">
      <h3>Bill To:</h3>
      <p><strong>${invoice.customer?.name || 'N/A'}</strong></p>
      <p>${invoice.customer?.phone || ''}</p>
      ${invoice.customer?.email ? `<p>${invoice.customer.email}</p>` : ''}
      ${invoice.customer?.address ? `
        <p>${invoice.customer.address.street || ''}</p>
        <p>${invoice.customer.address.area || ''}</p>
        <p>${invoice.customer.address.city || ''}, ${invoice.customer.address.state || ''} - ${invoice.customer.address.pincode || ''}</p>
      ` : ''}
    </div>
    <div class="invoice-details">
      <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
      ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
      <p><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>
      <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
      ${invoice.status === 'paid' ? '<div class="paid-stamp">✓ PAID</div>' : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-center">Quantity</th>
        <th class="text-right">Price</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>
            <strong>${item.description || item.product?.name || 'N/A'}</strong>
            ${item.product?.sku ? `<br><small>SKU: ${item.product.sku}</small>` : ''}
          </td>
          <td class="text-center">${item.quantity} cartons</td>
          <td class="text-right">₹${item.price.toFixed(2)}</td>
          <td class="text-right">₹${item.subtotal.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${invoice.subtotal.toFixed(2)}</span>
    </div>
    ${invoice.discount > 0 ? `
      <div class="totals-row" style="color: #16a34a;">
        <span>Discount:</span>
        <span>-₹${invoice.discount.toFixed(2)}</span>
      </div>
    ` : ''}
    ${invoice.tax > 0 ? `
      <div class="totals-row">
        <span>Tax:</span>
        <span>₹${invoice.tax.toFixed(2)}</span>
      </div>
    ` : ''}
    <div class="totals-row total-row">
      <span>Total:</span>
      <span>₹${invoice.totalAmount.toFixed(2)}</span>
    </div>
    ${invoice.paidAmount > 0 ? `
      <div class="totals-row">
        <span>Paid:</span>
        <span>₹${invoice.paidAmount.toFixed(2)}</span>
      </div>
    ` : ''}
    ${invoice.balanceAmount > 0 ? `
      <div class="totals-row balance-due">
        <span>Balance Due:</span>
        <span>₹${invoice.balanceAmount.toFixed(2)}</span>
      </div>
    ` : ''}
  </div>

  ${invoice.notes || invoice.terms ? `
    <div class="notes">
      ${invoice.notes ? `
        <h4>Notes:</h4>
        <p>${invoice.notes}</p>
      ` : ''}
      ${invoice.terms ? `
        <h4>Terms & Conditions:</h4>
        <p>${invoice.terms}</p>
      ` : ''}
    </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
  `;
}
