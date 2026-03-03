import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
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
  subtotal: {
    type: Number,
    required: true,
  },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    orderType: {
      type: String,
      enum: ['customer', 'guest'],
      default: 'customer',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false, // Not required for guest orders
    },
    guestInfo: {
      name: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: false,
      },
      address: {
        type: String,
        required: false,
      },
    },
    items: [OrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
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
    finalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'out-for-delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank-transfer', 'credit'],
      default: 'cash',
    },
    deliveryAddress: {
      street: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },
    deliveryDate: {
      type: Date,
    },
    deliveryTimeSlot: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    notes: {
      type: String,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
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

// Indexes for performance optimization
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ orderType: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, status: 1 });
OrderSchema.index({ deliveryDate: 1, status: 1 });
OrderSchema.index({ assignedTo: 1, status: 1 });
OrderSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
OrderSchema.index({ invoice: 1 });
OrderSchema.index({ createdAt: -1 });

// Compound index for common queries
OrderSchema.index({ createdBy: 1, paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ customer: 1, paymentStatus: 1, createdAt: -1 });

// Delete the model if it exists to force reload with new schema
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model('Order', OrderSchema);
