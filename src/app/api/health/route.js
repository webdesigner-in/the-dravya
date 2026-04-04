import { NextResponse } from 'next/server';

/** Public liveness — no infrastructure details in production. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const connectDB = (await import('@/lib/mongodb')).default;
  const mongoose = await import('mongoose');
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
