import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Check database connection
    await connectDB();
    
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        name: mongoose.connection.name,
      },
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}
