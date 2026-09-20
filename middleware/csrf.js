const crypto = require('crypto');

/**
 * Lightweight CSRF protection middleware using express-session
 */
const csrfProtection = (req, res, next) => {
  // Ensure session exists
  if (!req.session) {
    return next();
  }

  // Generate CSRF token if not already in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Expose CSRF token to views
  res.locals.csrfToken = req.session.csrfToken;

  // Ignore safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass CSRF for testing environments if explicitly set
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Verify CSRF token for state-changing methods
  const clientToken = req.body?._csrf || req.headers['x-csrf-token'];

  if (!clientToken || clientToken !== req.session.csrfToken) {
    console.warn(`[CSRF Mismatch]: IP ${req.ip} attempted ${req.method} ${req.originalUrl}`);
    req.flash('error', 'Form session expired or invalid CSRF token. Please try again.');
    return res.status(403).render('errors/403', {
      title: '403 - Invalid CSRF Token',
      message: 'Your session security token has expired or is invalid. Please refresh the page and try again.'
    });
  }

  next();
};

module.exports = csrfProtection;
