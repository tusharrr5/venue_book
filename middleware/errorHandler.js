/**
 * Central error handling middleware
 */

// Handle 404 - Not Found
const notFoundHandler = (req, res, next) => {
  res.status(404).render('errors/404', {
    title: '404 - Page Not Found',
    message: `The requested URL "${req.originalUrl}" was not found on this server.`
  });
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  console.error('[Application Error]:', err);

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).render('errors/404', {
      title: '404 - Resource Not Found',
      message: 'The requested resource identifier does not exist.'
    });
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    req.flash('error', `A record with that ${field} already exists.`);
    return res.redirect(req.header('Referer') || '/');
  }

  const statusCode = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).render('errors/500', {
    title: '500 - Server Error',
    message: isDev ? err.message : 'An unexpected error occurred on our server. Please try again later.',
    stack: isDev ? err.stack : null
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
