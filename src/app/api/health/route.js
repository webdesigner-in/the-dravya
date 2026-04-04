import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    const isConnected = mongoose.connection.readyState === 1;
    return NextResponse.json(
      { status: isConnected ? 'ok' : 'degraded' },
      { status: isConnected ? 200 : 503 }
    );
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
