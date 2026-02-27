/**
 * Utility functions for generating unique sequential numbers
 * Uses MongoDB's findOneAndUpdate with atomic increment to prevent duplicates
 */

import mongoose from 'mongoose';

// Counter schema for atomic increments
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// Delete existing model if it exists
if (mongoose.models.Counter) {
  delete mongoose.models.Counter;
}

const Counter = mongoose.model('Counter', CounterSchema);

/**
 * Get next sequence number atomically
 * This prevents race conditions even with concurrent requests
 */
async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

/**
 * Generate unique invoice number
 * Format: INV-{YEAR}{MONTH}-{TIMESTAMP}-{SEQ}
 * Example: INV-202602-1709123456-001
 * This format ensures uniqueness even with concurrent requests and deletions
 */
export async function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(now.getTime() / 1000); // Unix timestamp in seconds
  const seq = await getNextSequence('invoice');
  
  return `INV-${year}${month}-${timestamp}-${String(seq).padStart(3, '0')}`;
}

/**
 * Generate unique transaction number
 * Format: TXN-{YEAR}{MONTH}-{TIMESTAMP}-{SEQ}
 * Example: TXN-202602-1709123456-001
 */
export async function generateTransactionNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(now.getTime() / 1000);
  const seq = await getNextSequence('transaction');
  
  return `TXN-${year}${month}-${timestamp}-${String(seq).padStart(3, '0')}`;
}

/**
 * Generate unique order number
 * Format: ORD-{YEAR}{MONTH}-{TIMESTAMP}-{SEQ}
 * Example: ORD-202602-1709123456-001
 */
export async function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(now.getTime() / 1000);
  const seq = await getNextSequence('order');
  
  return `ORD-${year}${month}-${timestamp}-${String(seq).padStart(3, '0')}`;
}

/**
 * Generate unique route number
 * Format: RT-{YEAR}{MONTH}-{TIMESTAMP}-{SEQ}
 * Example: RT-202602-1709123456-001
 */
export async function generateRouteNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(now.getTime() / 1000);
  const seq = await getNextSequence('route');
  
  return `RT-${year}${month}-${timestamp}-${String(seq).padStart(3, '0')}`;
}
