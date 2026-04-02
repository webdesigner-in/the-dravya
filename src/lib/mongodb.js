import mongoose from 'mongoose';
import { preloadModels } from './preloadModels';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGO_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 3,  // Reduced from 10 for better Vercel serverless performance
      minPoolSize: 1,  // Reduced from 2
      serverSelectionTimeoutMS: 10000, // Increased from 5000 for production
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000, // Add connection timeout
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MongoDB connected successfully');
      }
      preloadModels();
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', error.message);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to get MongoDB connection:', e.message);
    throw e;
  }

  return cached.conn;
}

export default connectDB;
