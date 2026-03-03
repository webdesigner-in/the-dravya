import mongoose from 'mongoose';

const WarehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide warehouse name'],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
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
    capacity: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ['bottles', 'cartons', 'sqft', 'cubic-meter'],
        default: 'cartons',
      },
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['main', 'branch', 'distribution-center'],
      default: 'branch',
    },
    facilities: [
      {
        type: String,
        enum: ['cold-storage', 'loading-dock', 'parking', 'office', 'security'],
      },
    ],
    operatingHours: {
      open: String,
      close: String,
    },
    isActive: {
      type: Boolean,
      default: true,
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
// Note: code already has unique index from schema definition
WarehouseSchema.index({ location: '2dsphere' }, { sparse: true });
WarehouseSchema.index({ type: 1 });
WarehouseSchema.index({ isActive: 1 });

export default mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
