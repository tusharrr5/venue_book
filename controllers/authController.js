const User = require('../models/User');
const { ROLES } = require('../utils/constants');

/**
 * Controller for Authentication (Register, Login, Logout)
 */
class AuthController {
  static getLogin(req, res) {
    res.render('auth/login', {
      title: 'Sign In - VenueHub Campus',
      oldInput: req.flash('oldInput')[0] || {}
    });
  }

  static async postLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase().trim() });

      if (!user) {
        req.flash('error', 'Invalid email or password');
        req.flash('oldInput', { email });
        return res.redirect('/login');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        req.flash('error', 'Invalid email or password');
        req.flash('oldInput', { email });
        return res.redirect('/login');
      }

      // Establish session
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      req.flash('success', `Welcome back, ${user.name}!`);

      const returnTo = req.session.returnTo || (user.role === ROLES.ADMIN ? '/admin/dashboard' : '/dashboard');
      delete req.session.returnTo;
      res.redirect(returnTo);
    } catch (error) {
      next(error);
    }
  }

  static getRegister(req, res) {
    res.render('auth/register', {
      title: 'Register Organiser Account - VenueHub',
      oldInput: req.flash('oldInput')[0] || {}
    });
  }

  static async postRegister(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Check if email is already taken
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        req.flash('error', 'An account with this email already exists.');
        req.flash('oldInput', { name, email });
        return res.redirect('/register');
      }

      // Public registration is strictly ORGANISER role
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: ROLES.ORGANISER
      });

      await user.save();

      // Automatically sign in user
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      req.flash('success', 'Registration successful! Welcome to VenueHub.');
      res.redirect('/dashboard');
    } catch (error) {
      next(error);
    }
  }

  static postLogout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  }
}

module.exports = AuthController;
