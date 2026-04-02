import mongoose from 'mongoose';
import { registerModel } from '@/lib/modelRegistry';

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide customer name'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide phone number'],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    customerType: {
      type: String,
      enum: ['residential', 'commercial', 'industrial'],
      default: 'residential',
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
    },
    assignedDistributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
CustomerSchema.index({ phone: 1 }, { unique: true });
CustomerSchema.index({ email: 1 }, { sparse: true });
CustomerSchema.index({ isActive: 1, customerType: 1 });
CustomerSchema.index({ assignedDistributor: 1, isActive: 1 });
CustomerSchema.index({ createdAt: -1 });

// Text index for search
CustomerSchema.index({ name: 'text', phone: 'text' });

// Geospatial index - only if location exists
CustomerSchema.index({ location: '2dsphere' }, { sparse: true });

// Export model using production-grade registry
export default registerModel('Customer', CustomerSchema);
