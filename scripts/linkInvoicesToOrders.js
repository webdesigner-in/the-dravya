/**
 * Link Invoices to Orders Migration
 * Updates orders to include invoice reference for better performance
 * Run with: node scripts/linkInvoicesToOrders.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Order from '../src/models/Order.js';
import Invoice from '../src/models/Invoice.js';

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

async function linkInvoices() {
  try {
    console.log('🚀 Starting invoice linking...\n');
    
    await connectDB();
    
    // Get all invoices
    const invoices = await Invoice.find({}).select('_id order');
    console.log(`📊 Found ${invoices.length} invoices\n`);
    
    if (invoices.length === 0) {
      console.log('✅ No invoices to link!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    
    for (const invoice of invoices) {
      try {
        if (!invoice.order) {
          errorCount++;
          continue;
        }
        
        // Update the order with invoice reference
        const result = await Order.findByIdAndUpdate(
          invoice.order,
          { invoice: invoice._id },
          { new: true }
        );
        
        if (result) {
          successCount++;
        } else {
          notFoundCount++;
        }
        
        process.stdout.write(`\r✅ Linked: ${successCount} | ❌ Errors: ${errorCount} | ⚠️  Order Not Found: ${notFoundCount}`);
      } catch (error) {
        errorCount++;
        process.stdout.write(`\r✅ Linked: ${successCount} | ❌ Errors: ${errorCount} | ⚠️  Order Not Found: ${notFoundCount}`);
      }
    }
    
    console.log('\n\n📊 Linking Summary:');
    console.log(`   Total invoices: ${invoices.length}`);
    console.log(`   Successfully linked: ${successCount}`);
    console.log(`   Orders not found: ${notFoundCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    console.log('\n✅ Linking completed!');
    
  } catch (error) {
    console.error('\n❌ Linking error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

linkInvoices();
