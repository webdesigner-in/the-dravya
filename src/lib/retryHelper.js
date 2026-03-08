/**
 * Retry helper for database operations
 * Helps handle transient failures in production
 */

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} delayMs - Initial delay in milliseconds (default: 1000)
 * @returns {Promise} - Result of the operation
 */
export async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry on validation errors or auth errors
      if (
        error.name === 'ValidationError' ||
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404 ||
        error.code === 11000 // Duplicate key
      ) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify operation completed by checking the result
 * @param {Function} checkFn - Function that returns true if operation succeeded
 * @param {number} maxAttempts - Maximum verification attempts
 * @param {number} delayMs - Delay between attempts
 */
export async function verifyOperation(checkFn, maxAttempts = 5, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await delay(delayMs);
    }
    
    const result = await checkFn();
    if (result) {
      return true;
    }
  }
  
  return false;
}
