import mongoose from 'mongoose';
import { registerModel } from '@/lib/modelRegistry';

const StockMovementSchema = new mongoose.Schema(
  {
    movementNumber: {
      type: String,
      unique: true,
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['in', 'out', 'transfer', 'adjustment', 'return', 'damage'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    reason: {
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
    performedBy: {
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

// Indexes (removed duplicate - unique: true already creates index)
StockMovementSchema.index({ product: 1 });
StockMovementSchema.index({ type: 1 });
StockMovementSchema.index({ date: 1 });
StockMovementSchema.index({ fromWarehouse: 1 });
StockMovementSchema.index({ toWarehouse: 1 });

export default registerModel('StockMovement', StockMovementSchema);

