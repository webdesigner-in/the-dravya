import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'sale',
        'purchase',
        'salary',
        'fuel',
        'maintenance',
        'rent',
        'utility',
        'transport',
        'other',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank-transfer', 'cheque', 'credit'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    attachments: [
      {
        filename: String,
        url: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
// Note: transactionNumber already has unique index from schema definition
TransactionSchema.index({ type: 1, date: -1 });
TransactionSchema.index({ category: 1, date: -1 });
TransactionSchema.index({ customer: 1, date: -1 });
TransactionSchema.index({ order: 1 });
TransactionSchema.index({ createdBy: 1, date: -1 });
TransactionSchema.index({ paymentStatus: 1, type: 1 });
TransactionSchema.index({ date: -1 });

// Compound indexes for common queries
TransactionSchema.index({ type: 1, category: 1, date: -1 });
TransactionSchema.index({ customer: 1, type: 1, date: -1 });

// Text index for search
TransactionSchema.index({ description: 'text', reference: 'text' });

// Delete the model if it exists to force reload with new schema
if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

export default mongoose.model('Transaction', TransactionSchema);
