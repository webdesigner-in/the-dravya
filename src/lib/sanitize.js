/**
 * Escape special regex characters from user input to prevent ReDoS attacks.
 * Use this before passing any user-supplied string into a MongoDB $regex query.
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
