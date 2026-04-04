import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

/** Readiness with DB check (for orchestrators). Avoid exposing details in production body. */
export async function GET() {
  try {
    await connectDB();
    const ok = mongoose.connection.readyState === 1;
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
    }
    return NextResponse.json(
      { ok, readyState: mongoose.connection.readyState },
      { status: ok ? 200 : 503 }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
