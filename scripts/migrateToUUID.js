/**
 * Migrate to UUID-based Number System
 * Regenerates all order, invoice, and transaction numbers with new UUID format
 * Run with: node scripts/migrateToUUID.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config();

import Order from '../src/models/Order.js';
import Invoice from '../src/models/Invoice.js';
import Transaction from '../src/models/Transaction.js';
import Route from '../src/models/Route.js';

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('Please define the MONGO_URI environment variable');
    }
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

function generateShortId() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function generateNewOrderNumber(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  return `ORD-${year}${month}${day}-${uniqueId}`;
}

function generateNewInvoiceNumber(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  return `INV-${year}${month}${day}-${uniqueId}`;
}

function generateNewTransactionNumber(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  return `TXN-${year}${month}${day}-${uniqueId}`;
}

function generateNewRouteNumber(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const uniqueId = generateShortId();
  return `RT-${year}${month}${day}-${uniqueId}`;
}

async function migrateToUUID() {
  try {
    console.log('🚀 Starting UUID migration...\n');
    console.log('⚠️  This will regenerate all order, invoice, transaction, and route numbers\n');
    
    await connectDB();
    
    // Get counts
    const [orderCount, invoiceCount, transactionCount, routeCount] = await Promise.all([
      Order.countDocuments({}),
      Invoice.countDocuments({}),
      Transaction.countDocuments({}),
      Route.countDocuments({})
    ]);
    
    console.log('📊 Found:');
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Invoices: ${invoiceCount}`);
    console.log(`   Transactions: ${transactionCount}`);
    console.log(`   Routes: ${routeCount}`);
    console.log();
    
    let stats = {
      orders: { success: 0, error: 0 },
      invoices: { success: 0, error: 0 },
      transactions: { success: 0, error: 0 },
      routes: { success: 0, error: 0 }
    };
    
    // Migrate Orders
    if (orderCount > 0) {
      console.log('📦 Migrating Orders...');
      const orders = await Order.find({}).sort({ createdAt: 1 });
      
      for (const order of orders) {
        try {
          const newNumber = generateNewOrderNumber(order.createdAt);
          order.orderNumber = newNumber;
          await order.save();
          stats.orders.success++;
          process.stdout.write(`\r   ✅ ${stats.orders.success}/${orderCount}`);
        } catch (error) {
          stats.orders.error++;
          console.error(`\n   ❌ Error migrating order ${order._id}:`, error.message);
        }
      }
      console.log('\n');
    }
    
    // Migrate Invoices
    if (invoiceCount > 0) {
      console.log('📄 Migrating Invoices...');
      const invoices = await Invoice.find({}).sort({ issueDate: 1 });
      
      for (const invoice of invoices) {
        try {
          const newNumber = generateNewInvoiceNumber(invoice.issueDate);
          invoice.invoiceNumber = newNumber;
          await invoice.save();
          stats.invoices.success++;
          process.stdout.write(`\r   ✅ ${stats.invoices.success}/${invoiceCount}`);
        } catch (error) {
          stats.invoices.error++;
          console.error(`\n   ❌ Error migrating invoice ${invoice._id}:`, error.message);
        }
      }
      console.log('\n');
    }
    
    // Migrate Transactions
    if (transactionCount > 0) {
      console.log('💰 Migrating Transactions...');
      const transactions = await Transaction.find({}).sort({ date: 1 });
      
      for (const transaction of transactions) {
        try {
          const newNumber = generateNewTransactionNumber(transaction.date);
          transaction.transactionNumber = newNumber;
          await transaction.save();
          stats.transactions.success++;
          process.stdout.write(`\r   ✅ ${stats.transactions.success}/${transactionCount}`);
        } catch (error) {
          stats.transactions.error++;
          console.error(`\n   ❌ Error migrating transaction ${transaction._id}:`, error.message);
        }
      }
      console.log('\n');
    }
    
    // Migrate Routes
    if (routeCount > 0) {
      console.log('🚗 Migrating Routes...');
      const routes = await Route.find({}).sort({ createdAt: 1 });
      
      for (const route of routes) {
        try {
          const newNumber = generateNewRouteNumber(route.createdAt);
          route.routeNumber = newNumber;
          await route.save();
          stats.routes.success++;
          process.stdout.write(`\r   ✅ ${stats.routes.success}/${routeCount}`);
        } catch (error) {
          stats.routes.error++;
          console.error(`\n   ❌ Error migrating route ${route._id}:`, error.message);
        }
      }
      console.log('\n');
    }
    
    console.log('📊 Migration Summary:');
    console.log(`   Orders: ${stats.orders.success} migrated, ${stats.orders.error} errors`);
    console.log(`   Invoices: ${stats.invoices.success} migrated, ${stats.invoices.error} errors`);
    console.log(`   Transactions: ${stats.transactions.success} migrated, ${stats.transactions.error} errors`);
    console.log(`   Routes: ${stats.routes.success} migrated, ${stats.routes.error} errors`);
    
    const totalSuccess = stats.orders.success + stats.invoices.success + stats.transactions.success + stats.routes.success;
    const totalErrors = stats.orders.error + stats.invoices.error + stats.transactions.error + stats.routes.error;
    
    console.log(`\n   Total: ${totalSuccess} migrated, ${totalErrors} errors`);
    
    console.log('\n✅ Migration completed!');
    console.log('\n💡 Benefits:');
    console.log('   - No more gaps in numbering (deleted items won\'t create gaps)');
    console.log('   - No conflicts even with concurrent requests');
    console.log('   - Faster generation (no database queries needed)');
    console.log('   - Date-based format for easy searching');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

migrateToUUID();
