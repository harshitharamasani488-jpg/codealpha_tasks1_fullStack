function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.userRole !== 'admin') {
    return res.status(403).send('Access denied.');
  }
  next();
}

function loadUser(req, res, next) {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    name: req.session.userName,
    email: req.session.userEmail,
    role: req.session.userRole,
  } : null;
  res.locals.cartCount = req.session.cart
    ? Object.values(req.session.cart).reduce((sum, item) => sum + item.qty, 0)
    : 0;
  next();
}

module.exports = { requireAuth, requireAdmin, loadUser };
