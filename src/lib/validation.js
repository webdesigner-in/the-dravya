/**
 * Input validation utilities
 */

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone) {
  // Indian phone number: 10 digits
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

export function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function validateOrderData(data) {
  const errors = [];

  // Check order type
  if (!data.orderType || !['customer', 'guest'].includes(data.orderType)) {
    errors.push('Invalid order type');
  }

  // Validate based on order type
  if (data.orderType === 'customer') {
    if (!data.customer) {
      errors.push('Customer is required for customer orders');
    }
  } else if (data.orderType === 'guest') {
    if (!data.guestInfo || !data.guestInfo.name) {
      errors.push('Guest name is required for guest orders');
    }
    if (!data.guestInfo || !data.guestInfo.phone) {
      errors.push('Guest phone is required for guest orders');
    }
  }

  // Validate items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    data.items.forEach((item, index) => {
      if (!item.product) {
        errors.push(`Item ${index + 1}: Product is required`);
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (item.price === undefined || item.price < 0) {
        errors.push(`Item ${index + 1}: Valid price is required`);
      }
    });
  }

  // Validate amounts
  if (data.totalAmount === undefined || data.totalAmount < 0) {
    errors.push('Valid total amount is required');
  }
  if (data.finalAmount === undefined || data.finalAmount < 0) {
    errors.push('Valid final amount is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCustomerData(data) {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Customer name is required');
  }

  if (!data.phone || data.phone.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.creditLimit !== undefined && data.creditLimit < 0) {
    errors.push('Credit limit cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateProductData(data) {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!data.sku || data.sku.trim().length === 0) {
    errors.push('SKU is required');
  }

  if (data.price === undefined || data.price < 0) {
    errors.push('Valid price is required');
  }

  if (data.costPrice === undefined || data.costPrice < 0) {
    errors.push('Valid cost price is required');
  }

  if (!data.size || !data.size.value || data.size.value <= 0) {
    errors.push('Valid size is required');
  }

  if (!data.bottlesPerCarton || data.bottlesPerCarton < 1) {
    errors.push('Bottles per carton must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateTransactionData(data) {
  const errors = [];

  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.push('Valid transaction type is required');
  }

  if (!data.category) {
    errors.push('Category is required');
  }

  if (data.amount === undefined || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!data.paymentMethod) {
    errors.push('Payment method is required');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!data.date) {
    errors.push('Date is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
