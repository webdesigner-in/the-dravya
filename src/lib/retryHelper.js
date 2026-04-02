/**
 * Async delay utility
 * @param {number} ms - Milliseconds to wait
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
