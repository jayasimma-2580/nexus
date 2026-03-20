/**
 * utils/asyncHandler.js
 * Wraps async route handlers — forwards any rejection to Express error handler.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
