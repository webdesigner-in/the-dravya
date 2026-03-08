/**
 * Sanitize error messages for user display
 * Prevents technical errors from being shown to users
 */

const TECHNICAL_ERROR_PATTERNS = [
  /schema/i,
  /mongoose/i,
  /mongodb/i,
  /model/i,
  /database/i,
  /connection/i,
  /timeout/i,
  /ECONNREFUSED/i,
  /stack trace/i,
  /at \w+\./i, // Stack trace patterns
];

const USER_FRIENDLY_MESSAGES = {
  network: "Network error. Please check your connection and try again.",
  server: "Server error. Please try again later.",
  notFound: "The requested resource was not found.",
  unauthorized: "You are not authorized to perform this action.",
  validation: "Please check your input and try again.",
  default: "Something went wrong. Please try again.",
};

/**
 * Get user-friendly error message
 * @param {Error|string} error - Error object or message
 * @returns {string} - User-friendly error message
 */
export function getUserFriendlyError(error) {
  let errorMessage = '';
  
  // Extract message from error object or use as string
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.message) {
    errorMessage = error.message;
  } else {
    return USER_FRIENDLY_MESSAGES.default;
  }

  // Check if error contains technical patterns
  const isTechnicalError = TECHNICAL_ERROR_PATTERNS.some(pattern => 
    pattern.test(errorMessage)
  );

  if (isTechnicalError) {
    // Return generic message for technical errors
    return USER_FRIENDLY_MESSAGES.server;
  }

  // Check for specific error types
  if (errorMessage.toLowerCase().includes('network') || 
      errorMessage.toLowerCase().includes('fetch')) {
    return USER_FRIENDLY_MESSAGES.network;
  }

  if (errorMessage.toLowerCase().includes('not found')) {
    return USER_FRIENDLY_MESSAGES.notFound;
  }

  if (errorMessage.toLowerCase().includes('unauthorized') || 
      errorMessage.toLowerCase().includes('forbidden')) {
    return USER_FRIENDLY_MESSAGES.unauthorized;
  }

  if (errorMessage.toLowerCase().includes('validation') || 
      errorMessage.toLowerCase().includes('invalid')) {
    return USER_FRIENDLY_MESSAGES.validation;
  }

  // If error message is user-friendly (short and clear), return it
  if (errorMessage.length < 100 && !errorMessage.includes('Error:')) {
    return errorMessage;
  }

  // Default fallback
  return USER_FRIENDLY_MESSAGES.default;
}

/**
 * Log error for debugging while showing user-friendly message
 * @param {Error|string} error - Error to log
 * @param {string} context - Context where error occurred
 */
export function logAndGetUserError(error, context = '') {
  // Log full error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
  
  return getUserFriendlyError(error);
}
