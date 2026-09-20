const { ROLES } = require('../utils/constants');

/**
 * Role-based authorization middleware
 */

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === ROLES.ADMIN) {
    return next();
  }
  
  if (req.accepts('html')) {
    return res.status(403).render('errors/403', {
      title: '403 Forbidden - Access Denied',
      message: 'You do not have permission to access administrator resources.'
    });
  }
  
  res.status(403).json({ error: 'Access forbidden: Admins only' });
};

const isOrganiser = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === ROLES.ORGANISER) {
    return next();
  }
  
  if (req.session && req.session.user && req.session.user.role === ROLES.ADMIN) {
    // Admins can also perform organiser actions
    return next();
  }

  res.status(403).render('errors/403', {
    title: '403 Forbidden - Access Denied',
    message: 'You do not have permission to perform this action.'
  });
};

module.exports = {
  isAdmin,
  isOrganiser
};
