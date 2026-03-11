import mongoose from 'mongoose';
import { registerModel } from '@/lib/modelRegistry';

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['bottle', 'jar', 'can', 'dispenser', 'other'],
      default: 'bottle',
    },
    size: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ['ml', 'liter', 'gallon'],
        default: 'liter',
      },
    },
    bottlesPerCarton: {
      type: Number,
      required: true,
      default: 1,
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
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
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sku: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
// Note: sku already has unique index from schema definition
ProductSchema.index({ barcode: 1 }, { sparse: true });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ isActive: 1, stock: 1 });
ProductSchema.index({ stock: 1, minStockLevel: 1 });
ProductSchema.index({ createdAt: -1 });

// Text index for search
ProductSchema.index({ name: 'text', description: 'text' });

// Export model using production-grade registry
export default registerModel('Product', ProductSchema);
