import mongoose from 'mongoose';
import { registerModel } from '@/lib/modelRegistry';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['admin', 'distributor'],
      default: 'distributor',
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
    },
    businessName: {
      type: String,
      trim: true,
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

// Hash password before saving; invalidate other sessions when password changes
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  if (!this.isNew) {
    this.tokenVersion = (this.tokenVersion ?? 0) + 1;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default registerModel('User', UserSchema);

