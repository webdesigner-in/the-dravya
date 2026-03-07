import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/errorHandler';

// POST generate WhatsApp share link
export async function POST(request, { params }) {
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
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber orderType guestInfo');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get phone number from customer or guest info
    let phone = null;
    let customerName = 'Customer';

    if (invoice.customer) {
      phone = invoice.customer.phone;
      customerName = invoice.customer.name;
    } else if (invoice.guestInfo) {
      phone = invoice.guestInfo.phone;
      customerName = invoice.guestInfo.name;
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number not available for this invoice' },
        { status: 400 }
      );
    }

    // Clean phone number (remove spaces, dashes, etc.)
    phone = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (!phone.startsWith('91') && phone.length === 10) {
      phone = '91' + phone;
    }

    // Generate invoice message
    const message = generateWhatsAppMessage(invoice, customerName);

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      whatsappUrl,
      phone,
    });
  } catch (error) {
    const { error: errorMessage, statusCode, details } = handleApiError(error, 'Failed to generate WhatsApp link');
    return NextResponse.json(
      { error: errorMessage, details },
      { status: statusCode }
    );
  }
}

function generateWhatsAppMessage(invoice, customerName) {
  const invoiceNumber = invoice.invoiceNumber;
  const orderNumber = invoice.order?.orderNumber || 'N/A';
  const totalAmount = invoice.totalAmount.toFixed(2);
  const balanceAmount = invoice.balanceAmount.toFixed(2);
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');

  let message = `Hello ${customerName},\n\n`;
  message += `Your invoice is ready!\n\n`;
  message += `📄 *Invoice Details*\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `Invoice No: *${invoiceNumber}*\n`;
  message += `Order No: *${orderNumber}*\n`;
  message += `Total Amount: *₹${totalAmount}*\n`;
  
  if (invoice.balanceAmount > 0) {
    message += `Balance Due: *₹${balanceAmount}*\n`;
    message += `Due Date: *${dueDate}*\n`;
  }
  
  message += `\n📦 *Items*\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  
  invoice.items.forEach((item, index) => {
    const itemName = item.description || item.product?.name || 'Item';
    message += `${index + 1}. ${itemName}\n`;
    message += `   Qty: ${item.quantity} cartons × ₹${item.price.toFixed(2)} = ₹${item.subtotal.toFixed(2)}\n`;
  });

  message += `\n`;
  
  if (invoice.notes) {
    message += `📝 *Note:* ${invoice.notes}\n\n`;
  }

  message += `Thank you for your business! 🙏\n`;
  message += `\n_This is an automated message from our water distribution system._`;

  return message;
}
