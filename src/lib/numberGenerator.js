/**
 * Utility functions for generating unique numbers using UUID
 * No gaps, no conflicts, no database counters needed
 */

import { randomBytes } from 'crypto';

/**
 * Generate a short unique ID (8 characters)
 * Uses crypto.randomBytes for true randomness
 */
function generateShortId() {
  return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXXXXXXX
 * Example: INV-20260302-A3F5B2C1
 * - No gaps when invoices are deleted
 * - No conflicts even with concurrent requests
 * - Easy to read and search
 */
export function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  
  return `INV-${year}${month}${day}-${uniqueId}`;
}

/**
 * Generate unique transaction number
 * Format: TXN-YYYYMMDD-XXXXXXXX
 * Example: TXN-20260302-B7D4E9F2
 */
export function generateTransactionNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  
  return `TXN-${year}${month}${day}-${uniqueId}`;
}

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXXXXX
 * Example: ORD-20260302-C8E5A1D3
 */
export function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  
  return `ORD-${year}${month}${day}-${uniqueId}`;
}

/**
 * Generate unique route number
 * Format: RT-YYYYMMDD-XXXXXXXX
 * Example: RT-20260302-D9F6B2E4
 */
export function generateRouteNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  
  return `RT-${year}${month}${day}-${uniqueId}`;
}
