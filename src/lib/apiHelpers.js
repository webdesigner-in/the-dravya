import { NextResponse } from 'next/server';

/**
 * Standard error response handler
 */
export function errorResponse(error, defaultMessage = 'Something went wrong') {
  // Error is already logged by the logger in the route handlers

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return NextResponse.json(
      { error: messages.join(', ') },
      { status: 400 }
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return NextResponse.json(
      { error: 'Invalid ID format' },
      { status: 400 }
    );
  }

  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return NextResponse.json(
      { error: `${field} already exists` },
      { status: 409 }
    );
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }

  if (error.name === 'TokenExpiredError') {
    return NextResponse.json(
      { error: 'Token expired' },
      { status: 401 }
    );
  }

  // Custom error with status
  if (error.status) {
    return NextResponse.json(
      { error: error.message || defaultMessage },
      { status: error.status }
    );
  }

  // Default error
  return NextResponse.json(
    { error: error.message || defaultMessage },
    { status: 500 }
  );
}

/**
 * Success response helper
 */
export function successResponse(data, status = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

/**
 * Validate required fields
 */
export function validateRequired(data, fields) {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

/**
 * Sanitize input to prevent injection
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

/**
 * Parse pagination params
 */
export function parsePagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination response
 */
export function buildPaginationResponse(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    items,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasMore: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
