const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../db/database');

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.send(renderLogin({ error: null, email: '' }));
});

// POST /auth/login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.send(renderLogin({ error: 'Please enter a valid email and password.', email: req.body.email }));
    }
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.send(renderLogin({ error: 'Invalid email or password.', email }));
    }
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

// GET /auth/register
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.send(renderRegister({ error: null, name: '', email: '' }));
});

// POST /auth/register
router.post('/register',
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.send(renderRegister({ error: 'Please fill all fields correctly. Password must be 6+ characters.', name: req.body.name, email: req.body.email }));
    }
    const { name, email, password } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.send(renderRegister({ error: 'Email already registered. Please login.', name, email }));
    }
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashed);
    req.session.userId = result.lastInsertRowid;
    req.session.userName = name;
    req.session.userEmail = email;
    req.session.userRole = 'customer';
    res.redirect('/');
  }
);

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

function renderLogin({ error, email }) {
  return baseLayout('Login', `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-icon">🔑</div>
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>
        ${error ? `<div class="alert alert-error">${error}</div>` : ''}
        <form method="POST" action="/auth/login" class="auth-form">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" name="email" value="${email}" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Your password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Sign In</button>
        </form>
        <p class="auth-switch">Don't have an account? <a href="/auth/register">Create one</a></p>
      </div>
    </div>
  `);
}

function renderRegister({ error, name, email }) {
  return baseLayout('Register', `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-icon">✨</div>
          <h1>Create Account</h1>
          <p>Join us today</p>
        </div>
        ${error ? `<div class="alert alert-error">${error}</div>` : ''}
        <form method="POST" action="/auth/register" class="auth-form">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value="${name}" placeholder="Jane Doe" required>
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" name="email" value="${email}" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label>Password <span class="hint">(min 6 characters)</span></label>
            <input type="password" name="password" placeholder="Choose a strong password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
        <p class="auth-switch">Already have an account? <a href="/auth/login">Sign in</a></p>
      </div>
    </div>
  `);
}

function baseLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ShopZen</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav class="navbar">
    <a href="/" class="nav-brand">🛍️ ShopZen</a>
    <div class="nav-links">
      <a href="/">Shop</a>
      <a href="/auth/login">Login</a>
      <a href="/auth/register">Register</a>
    </div>
  </nav>
  <main>${content}</main>
</body>
</html>`;
}

module.exports = router;
