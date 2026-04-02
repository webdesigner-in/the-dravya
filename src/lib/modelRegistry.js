import mongoose from 'mongoose';

/**
 * Safely register a Mongoose model — prevents OverwriteModelError
 * in serverless environments where modules may be re-evaluated.
 *
 * @param {string} name - Model name
 * @param {mongoose.Schema} schema - Mongoose schema
 * @returns {mongoose.Model}
 */
export function registerModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export default registerModel;
