const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session (file-based using json)
const sessionStore = session.MemoryStore ? new session.MemoryStore() : undefined;
app.use(session({
  secret: 'shopzen-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Load user into res.locals
const { loadUser } = require('./middleware/auth');
app.use(loadUser);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/cart', require('./routes/cart'));
app.use('/checkout', require('./routes/cart'));
app.use('/orders', require('./routes/orders'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/products'));

// 404
app.use((req, res) => {
  res.status(404).send(`<!DOCTYPE html>
<html><head><title>404 — ShopZen</title><link rel="stylesheet" href="/css/style.css"></head>
<body>
  <nav class="navbar"><a href="/" class="nav-brand">🛍️ ShopZen</a></nav>
  <div class="container" style="text-align:center;padding:80px 20px">
    <h1 style="font-size:6rem;margin:0">404</h1>
    <h2>Page Not Found</h2>
    <a href="/" class="btn btn-primary" style="margin-top:20px">Go Home</a>
  </div>
</body></html>`);
});

// Start after DB init
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🛍️  ShopZen is running!`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`\n   Run "npm run seed" first if this is your first time!\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
