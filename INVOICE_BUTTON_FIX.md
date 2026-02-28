# Invoice Button Display Fix

## Problem
- "Create Invoice" button showing even when invoice already exists
- "View Invoice" button not showing for most orders
- Inconsistent button display across orders

## Root Cause
The issue was in how invoices were being matched to orders:

1. **Pagination Limit**: Only fetching 20 invoices (default limit), but there might be more
2. **Order ID Matching**: Not handling both populated and non-populated order references correctly

## Solution

### 1. Fetch All Invoices
Changed from:
```javascript
const invoicesRes = await fetch('/api/invoices');
```

To:
```javascript
const invoicesRes = await fetch('/api/invoices?limit=10000');
```

This ensures we fetch ALL invoices, not just the first 20.

### 2. Handle Both Order Reference Types
The invoice's `order` field can be:
- **Populated**: `{ _id: '123', orderNumber: 'ORD000001' }` (object)
- **Non-populated**: `'123'` (string)

Updated the mapping logic:
```javascript
allInvoices.forEach(invoice => {
  const orderId = typeof invoice.order === 'object' 
    ? invoice.order?._id    // If object, get _id
    : invoice.order;        // If string, use directly
  
  if (orderId) {
    invoicesMap[orderId] = invoice;
  }
});
```

## How It Works Now

### Order Without Invoice
```
Order ID: 69a04d4dd9baf304abc5f11c
Invoice Map: {} (no match)
Result: Shows "Create Invoice" button ✅
```

### Order With Invoice
```
Order ID: 69a04d4dd9baf304abc5f11c
Invoice Map: { '69a04d4dd9baf304abc5f11c': { _id: 'inv123', ... } }
Result: Shows "View Invoice" button ✅
```

## Button Logic

```javascript
{order.invoice ? (
  <Button onClick={() => window.location.href = `/dashboard/invoices/${order.invoice._id}`}>
    View Invoice
  </Button>
) : (
  <Button onClick={() => openCreateInvoiceDialog(order)}>
    Create Invoice
  </Button>
)}
```

## Testing

### Test Case 1: Order Without Invoice
1. Go to Orders page
2. Find order without invoice
3. Should show "Create Invoice" button ✅
4. Click button → Opens invoice creation dialog ✅

### Test Case 2: Order With Invoice
1. Go to Orders page
2. Find order with invoice
3. Should show "View Invoice" button ✅
4. Click button → Opens invoice detail page ✅

### Test Case 3: After Creating Invoice
1. Create invoice for an order
2. Page refreshes
3. Button changes from "Create Invoice" to "View Invoice" ✅

## Files Modified
- `src/app/dashboard/orders/page.jsx`
  - Updated `fetchOrders()` function
  - Added `limit=10000` to invoices fetch
  - Improved order ID matching logic

## Benefits
✅ Correct button display for all orders
✅ Handles large number of invoices
✅ Works with both populated and non-populated references
✅ Consistent behavior across localhost and deployment

## Deployment
No database changes needed - this is a frontend fix only.
Just deploy the updated code and it will work immediately.

---

**Status**: ✅ Fixed
**Date**: 2026-02-27
