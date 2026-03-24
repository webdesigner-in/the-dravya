import mongoose from 'mongoose';

/**
 * RateLimit model — stores request counts per (key, time-window) pair in MongoDB.
 *
 * Using MongoDB as the backing store means rate-limit counts are shared across
 * ALL serverless instances (Vercel functions, containers, etc.) instead of being
 * siloed in each process's heap.
 *
 * The TTL index on `expireAt` lets MongoDB automatically garbage-collect old
 * documents; no cron job or manual cleanup needed.
 */
const RateLimitSchema = new mongoose.Schema(
  {
    /** Identifier — typically an IP address or "action:ip" string. */
    key: { type: String, required: true },
    /** Start of the current sliding window (truncated to windowMs). */
    windowStart: { type: Date, required: true },
    /** Number of requests recorded in this window. */
    count: { type: Number, default: 1 },
    /** MongoDB TTL: document is auto-deleted after this timestamp. */
    expireAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

// One document per (key, window) — enforces uniqueness for the upsert pattern.
RateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });

// MongoDB TTL index: documents are deleted automatically when expireAt is reached.
RateLimitSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.RateLimit ||
  mongoose.model('RateLimit', RateLimitSchema);
