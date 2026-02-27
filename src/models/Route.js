import mongoose from 'mongoose';

const RouteStopSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  sequence: {
    type: Number,
    required: true,
  },
  estimatedTime: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
  },
  notes: {
    type: String,
  },
});

const RouteSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    routeNumber: {
      type: String,
      unique: true,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stops: [RouteStopSchema],
    startLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
      address: String,
    },
    endLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
      address: String,
    },
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    totalDistance: {
      type: Number, // in km
    },
    estimatedDuration: {
      type: Number, // in minutes
    },
    actualDuration: {
      type: Number, // in minutes
    },
    notes: {
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

// Indexes (removed duplicate from unique field)
RouteSchema.index({ date: 1 });
RouteSchema.index({ status: 1 });
RouteSchema.index({ driver: 1 });
RouteSchema.index({ vehicle: 1 });

export default mongoose.models.Route || mongoose.model('Route', RouteSchema);
