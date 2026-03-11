import mongoose from 'mongoose';
import { registerModel } from '@/lib/modelRegistry';

const InvoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  description: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    min: 0,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  subtotal: {
    type: Number,
    required: true,
  },
});

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false, // Optional for guest orders
    },
    guestInfo: {
      name: {
        type: String,
      },
      phone: {
        type: String,
      },
      address: {
        type: String,
      },
    },
    items: [InvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
      default: 'draft',
    },
    paymentHistory: [{
      amount: {
        type: Number,
        required: true,
      },
      paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank-transfer', 'cheque', 'credit'],
        required: true,
      },
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
      date: {
        type: Date,
        default: Date.now,
      },
      notes: {
        type: String,
      },
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: false,
      default: null,
    },
    paymentTerms: {
      type: String,
      default: 'Due on receipt',
    },
    notes: {
      type: String,
    },
    terms: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate balance amount before saving (synchronous, no callback needed)
InvoiceSchema.pre('save', function () {
  this.balanceAmount = this.totalAmount - this.paidAmount;
});

// Indexes for performance optimization
// Note: invoiceNumber already has unique index from schema definition
InvoiceSchema.index({ order: 1 }, { unique: true });
InvoiceSchema.index({ customer: 1, issueDate: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ status: 1, issueDate: -1 });
InvoiceSchema.index({ createdBy: 1, issueDate: -1 });
InvoiceSchema.index({ balanceAmount: 1, status: 1 });
InvoiceSchema.index({ issueDate: -1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });

// Compound index for overdue invoices
InvoiceSchema.index({ status: 1, dueDate: 1, balanceAmount: 1 });

// Export model using production-grade registry
export default registerModel('Invoice', InvoiceSchema);
