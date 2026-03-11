/**
 * Production-grade model registry for Mongoose
 * Prevents MissingSchemaError in serverless environments
 */

import mongoose from 'mongoose';

// Model registry to track registered models
const modelRegistry = new Map();

/**
 * Safely register a Mongoose model
 * @param {string} name - Model name
 * @param {mongoose.Schema} schema - Mongoose schema
 * @returns {mongoose.Model} - Registered model
 */
export function registerModel(name, schema) {
  try {
    // Check if model already exists in Mongoose
    if (mongoose.models[name]) {
      return mongoose.models[name];
    }

    // Check our registry
    if (modelRegistry.has(name)) {
      return modelRegistry.get(name);
    }

    // Create new model
    const model = mongoose.model(name, schema);
    
    // Store in our registry
    modelRegistry.set(name, model);
    
    return model;
  } catch (error) {
    // If model creation fails, try to return existing model
    if (mongoose.models[name]) {
      return mongoose.models[name];
    }
    
    // If we have it in registry, return it
    if (modelRegistry.has(name)) {
      return modelRegistry.get(name);
    }
    
    throw error;
  }
}

/**
 * Get a registered model safely
 * @param {string} name - Model name
 * @returns {mongoose.Model|null} - Model or null if not found
 */
export function getModel(name) {
  // Check Mongoose models first
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  
  // Check our registry
  if (modelRegistry.has(name)) {
    return modelRegistry.get(name);
  }
  
  return null;
}

/**
 * Check if a model is registered
 * @param {string} name - Model name
 * @returns {boolean} - True if model exists
 */
export function hasModel(name) {
  return mongoose.models[name] || modelRegistry.has(name);
}

/**
 * Clear all models (for testing purposes)
 */
export function clearModels() {
  modelRegistry.clear();
  
  // Clear mongoose models
  Object.keys(mongoose.models).forEach(key => {
    delete mongoose.models[key];
  });
}

/**
 * Get all registered model names
 * @returns {string[]} - Array of model names
 */
export function getRegisteredModels() {
  const mongooseModels = Object.keys(mongoose.models);
  const registryModels = Array.from(modelRegistry.keys());
  
  return [...new Set([...mongooseModels, ...registryModels])];
}

export default registerModel;