/**
 * UPI Payment Utilities
 * Generate UPI payment links and QR codes
 */

/**
 * Generate UPI payment string
 * @param {string} upiId - Your UPI ID (e.g., yourname@paytm)
 * @param {string} name - Payee name
 * @param {number} amount - Payment amount
 * @param {string} note - Payment note/reference
 * @returns {string} UPI payment string
 */
export function generateUPIString(upiId, name, amount, note = "") {
  if (!upiId) return null;
  
  const params = new URLSearchParams({
    pa: upiId, // Payee address (UPI ID)
    pn: name, // Payee name
    am: amount.toFixed(2), // Amount
    cu: "INR", // Currency
    tn: note || "Payment", // Transaction note
  });
  
  return `upi://pay?${params.toString()}`;
}

/**
 * Generate UPI QR code data URL
 * Uses a free QR code API
 */
export function generateUPIQRCode(upiString, size = 300) {
  if (!upiString) return null;
  
  // Using goqr.me free API (no registration needed)
  const encodedData = encodeURIComponent(upiString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

/**
 * Format UPI ID for display
 */
export function formatUPIId(upiId) {
  if (!upiId) return "";
  return upiId.toLowerCase().trim();
}

/**
 * Validate UPI ID format
 */
export function validateUPIId(upiId) {
  if (!upiId) return false;
  
  // Basic UPI ID format: username@provider
  const upiRegex = /^[\w.-]+@[\w.-]+$/;
  return upiRegex.test(upiId);
}
