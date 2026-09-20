/**
 * Authentication and session middleware
 */

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to access this page.');
  res.redirect('/login');
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/dashboard');
  }
  next();
};

const attachUserToViews = (req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.isAuthenticated = !!(req.session && req.session.user);
  res.locals.isAdmin = req.session && req.session.user && req.session.user.role === 'admin';
  res.locals.currentPath = req.path;
  
  // Flash messages
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    warning: req.flash('warning'),
    info: req.flash('info')
  };

  next();
};

module.exports = {
  isAuthenticated,
  isGuest,
  attachUserToViews
};
