/**
 * Model preloader for production environments
 * Ensures all models are registered before API calls
 */

// Import all models to trigger registration
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Route from '@/models/Route';
import StockMovement from '@/models/StockMovement';
import Session from '@/models/Session';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import Warehouse from '@/models/Warehouse';
import Notification from '@/models/Notification';

/**
 * Preload all models to prevent MissingSchemaError
 * Call this in API routes or at app startup
 */
export function preloadModels() {
  // Models are automatically registered when imported
  // This function ensures they're all loaded
  const models = {
    Customer,
    Invoice,
    Order,
    Product,
    Route,
    StockMovement,
    Session,
    Transaction,
    User,
    Vehicle,
    Warehouse,
    Notification,
  };

  return models;
}

// Auto-preload in production
if (process.env.NODE_ENV === 'production') {
  preloadModels();
}

export default preloadModels;
