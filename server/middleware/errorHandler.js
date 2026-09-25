export const errorHandler = (err, req, res, next) => {
  // Safe internal logging without secrets
  console.error(`❌ [${new Date().toISOString()}] Error processing ${req.method} ${req.url}:`, {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.userMessage || err.message || 'An unexpected error occurred. Please try again.'
    }
  });
};
