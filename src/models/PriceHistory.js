import mongoose from 'mongoose';
import { registerModel } from '@/lib/modelRegistry';

/**
 * Tracks cost price changes for products over time.
 * Selling price history is derived from Order.items[].price (already recorded per order).
 * This model only needs to track cost price since that's not stored per-order.
 */
const PriceHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // The catalog selling price at this point in time
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

PriceHistorySchema.index({ product: 1, effectiveFrom: -1 });

export default registerModel('PriceHistory', PriceHistorySchema);
