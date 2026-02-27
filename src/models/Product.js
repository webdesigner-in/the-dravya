import mongoose from 'mongoose';

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

// Index for faster queries (removed duplicate)
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
