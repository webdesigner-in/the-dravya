import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Please provide vehicle number'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'auto', 'van', 'truck', 'tempo'],
      required: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    capacity: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ['cartons', 'kg', 'liters'],
        default: 'cartons',
      },
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['available', 'in-use', 'maintenance', 'inactive'],
      default: 'available',
    },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'cng', 'electric'],
    },
    registrationDate: {
      type: Date,
    },
    insuranceExpiry: {
      type: Date,
    },
    lastServiceDate: {
      type: Date,
    },
    nextServiceDate: {
      type: Date,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    mileage: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries - only if location exists
VehicleSchema.index({ currentLocation: '2dsphere' }, { sparse: true });
VehicleSchema.index({ vehicleNumber: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ driver: 1 });

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
