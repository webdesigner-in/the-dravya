/**
 * Standardized error handler for API routes
 * Provides consistent error messages and status codes
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
  if (process.env.NODE_ENV !== 'production') {
    console.error('API Error:', error);
  }
  
  let errorMessage = defaultMessage;
  let statusCode = 500;
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    errorMessage = Object.values(error.errors)
      .map(e => e.message)
      .join(', ');
    statusCode = 400;
  }
  // Mongoose cast error (invalid ID format)
  else if (error.name === 'CastError') {
    errorMessage = 'Invalid ID format';
    statusCode = 400;
  }
  // MongoDB duplicate key error
  else if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    errorMessage = field 
      ? `A record with this ${field} already exists`
      : 'Duplicate record found';
    statusCode = 409;
  }
  // Custom error with message — determine status code from content
  else if (error.message) {
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Unauthorized') || error.message.includes('permission')) {
      statusCode = 403;
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
    }
    // For 4xx errors the message is intentional (user-facing).
    // For 5xx errors in production, return only the generic defaultMessage to
    // avoid leaking internal implementation details (file paths, DB schema, etc.)
    errorMessage = statusCode < 500 || process.env.NODE_ENV !== 'production'
      ? error.message
      : defaultMessage;
  }
  
  return {
    error: errorMessage,
    statusCode,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}
