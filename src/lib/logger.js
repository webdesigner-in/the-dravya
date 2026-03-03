/**
 * Logging utility
 * In production, this should integrate with a logging service like Sentry, LogRocket, etc.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    
    if (data) {
      return `${prefix} ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message, data) {
    if (isDevelopment) {
      console.log(this.formatMessage('INFO', message, data), data || '');
    }
    // In production, send to logging service
  }

  warn(message, data) {
    if (isDevelopment) {
      console.warn(this.formatMessage('WARN', message, data), data || '');
    }
    // In production, send to logging service
  }

  error(message, error, data) {
    const errorData = {
      message: error?.message,
      stack: error?.stack,
      ...data,
    };

    if (isDevelopment) {
      console.error(this.formatMessage('ERROR', message, errorData), error);
    }
    
    // In production, send to error tracking service (Sentry, etc.)
    // Example: Sentry.captureException(error, { extra: errorData });
  }

  debug(message, data) {
    if (isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, data), data || '');
    }
  }
}

// Create default logger
export const logger = new Logger();

// Create logger with context
export function createLogger(context) {
  return new Logger(context);
}

export default logger;
