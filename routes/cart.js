const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// Cart is stored in session as { productId: { name, price, qty, image_url } }

// POST /cart/add
router.post('/add', (req, res) => {
  const { productId, qty = 1 } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product || product.stock < 1) {
    return res.json({ success: false, message: 'Product unavailable' });
  }
  if (!req.session.cart) req.session.cart = {};
  const cart = req.session.cart;
  if (cart[productId]) {
    cart[productId].qty = Math.min(cart[productId].qty + parseInt(qty), product.stock);
  } else {
    cart[productId] = {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      qty: parseInt(qty),
    };
  }
  const cartCount = Object.values(cart).reduce((sum, i) => sum + i.qty, 0);
  res.json({ success: true, cartCount });
});

// POST /cart/update
router.post('/update', (req, res) => {
  const { productId, qty } = req.body;
  if (!req.session.cart) return res.redirect('/cart');
  if (parseInt(qty) <= 0) {
    delete req.session.cart[productId];
  } else {
    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    if (req.session.cart[productId]) {
      req.session.cart[productId].qty = Math.min(parseInt(qty), product?.stock || 999);
    }
  }
  res.redirect('/cart');
});

// POST /cart/remove
router.post('/remove', (req, res) => {
  const { productId } = req.body;
  if (req.session.cart) delete req.session.cart[productId];
  res.redirect('/cart');
});

// GET /cart
router.get('/', (req, res) => {
  const cart = req.session.cart || {};
  const items = Object.values(cart);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 5.99;
  const total = subtotal + shipping;

  res.send(renderCart({ items, subtotal, shipping, total, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// GET /checkout
router.get('/checkout', requireAuth, (req, res) => {
  const cart = req.session.cart || {};
  const items = Object.values(cart);
  if (!items.length) return res.redirect('/cart');
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  res.send(renderCheckout({ items, subtotal, shipping, total, user: res.locals.user, cartCount: res.locals.cartCount, error: null }));
});

// POST /checkout
router.post('/checkout', requireAuth, (req, res) => {
  const cart = req.session.cart || {};
  const items = Object.values(cart);
  if (!items.length) return res.redirect('/cart');

  const { address, city, zip, country } = req.body;
  if (!address || !city || !zip || !country) {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const shipping = subtotal >= 50 ? 0 : 5.99;
    return res.send(renderCheckout({
      items, subtotal, shipping, total: subtotal + shipping,
      user: res.locals.user, cartCount: res.locals.cartCount,
      error: 'Please fill in all address fields.'
    }));
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  const shippingAddress = `${address}, ${city}, ${zip}, ${country}`;

  // Create order
  const orderResult = db.prepare(
    'INSERT INTO orders (user_id, total, status, shipping_address) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, total, 'confirmed', shippingAddress);

  const orderId = orderResult.lastInsertRowid;

  // Insert order items & update stock
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

  for (const item of items) {
    insertItem.run(orderId, item.id, item.qty, item.price);
    updateStock.run(item.qty, item.id);
  }

  req.session.cart = {};
  res.redirect(`/orders/${orderId}?success=1`);
});

function renderCart({ items, subtotal, shipping, total, user, cartCount }) {
  return baseLayout('Shopping Cart', `
    <div class="container">
      <h1 class="page-title">🛒 Shopping Cart</h1>
      ${items.length === 0 ? `
        <div class="empty-cart">
          <div class="empty-icon">🛍️</div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <a href="/" class="btn btn-primary">Start Shopping</a>
        </div>
      ` : `
        <div class="cart-layout">
          <div class="cart-items">
            ${items.map(item => `
              <div class="cart-item">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                  <h3>${item.name}</h3>
                  <p class="cart-item-price">$${item.price.toFixed(2)} each</p>
                </div>
                <form method="POST" action="/cart/update" class="cart-item-qty">
                  <input type="hidden" name="productId" value="${item.id}">
                  <div class="qty-inline">
                    <input type="number" name="qty" value="${item.qty}" min="0" max="99" onchange="this.form.submit()">
                  </div>
                </form>
                <div class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</div>
                <form method="POST" action="/cart/remove">
                  <input type="hidden" name="productId" value="${item.id}">
                  <button type="submit" class="btn-remove">✕</button>
                </form>
              </div>
            `).join('')}
          </div>
          <div class="cart-summary">
            <div class="summary-card">
              <h3>Order Summary</h3>
              <div class="summary-line"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
              <div class="summary-line"><span>Shipping</span><span>${shipping === 0 ? '<span class="free">FREE</span>' : '$' + shipping.toFixed(2)}</span></div>
              ${shipping > 0 ? `<p class="shipping-note">Add $${(50 - subtotal).toFixed(2)} more for free shipping</p>` : '<p class="shipping-note free">🎉 You qualify for free shipping!</p>'}
              <div class="summary-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
              ${user ? `<a href="/checkout" class="btn btn-primary btn-full">Proceed to Checkout</a>` : `<a href="/auth/login" class="btn btn-primary btn-full">Login to Checkout</a>`}
              <a href="/" class="btn btn-outline btn-full">Continue Shopping</a>
            </div>
          </div>
        </div>
      `}
    </div>
  `, user, cartCount);
}

function renderCheckout({ items, subtotal, shipping, total, user, cartCount, error }) {
  return baseLayout('Checkout', `
    <div class="container">
      <h1 class="page-title">💳 Checkout</h1>
      ${error ? `<div class="alert alert-error">${error}</div>` : ''}
      <div class="checkout-layout">
        <div class="checkout-form-section">
          <h2>Shipping Address</h2>
          <form method="POST" action="/checkout" class="checkout-form">
            <div class="form-group">
              <label>Street Address</label>
              <input type="text" name="address" placeholder="123 Main Street" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input type="text" name="city" placeholder="New York" required>
              </div>
              <div class="form-group">
                <label>ZIP Code</label>
                <input type="text" name="zip" placeholder="10001" required>
              </div>
            </div>
            <div class="form-group">
              <label>Country</label>
              <input type="text" name="country" placeholder="United States" required>
            </div>
            <h2 class="mt-2">Payment (Demo)</h2>
            <div class="demo-payment">
              <div class="form-group">
                <label>Card Number</label>
                <input type="text" placeholder="4242 4242 4242 4242" disabled value="4242 4242 4242 4242">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Expiry</label>
                  <input type="text" placeholder="12/26" disabled value="12/26">
                </div>
                <div class="form-group">
                  <label>CVV</label>
                  <input type="text" placeholder="123" disabled value="123">
                </div>
              </div>
              <p class="demo-note">⚠️ This is a demo. No real payment is processed.</p>
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg">Place Order — $${total.toFixed(2)}</button>
          </form>
        </div>
        <div class="checkout-summary">
          <h2>Order Items</h2>
          ${items.map(i => `
            <div class="checkout-item">
              <img src="${i.image_url}" alt="${i.name}">
              <div>
                <p>${i.name}</p>
                <small>Qty: ${i.qty}</small>
              </div>
              <span>$${(i.price * i.qty).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="summary-line"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="summary-line"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
          <div class="summary-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  `, user, cartCount);
}

function baseLayout(title, content, user, cartCount) {
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
      ${user ? `
        <a href="/orders">My Orders</a>
        ${user.role === 'admin' ? '<a href="/admin" class="nav-admin">Admin</a>' : ''}
        <a href="/auth/logout">Logout (${user.name.split(' ')[0]})</a>
      ` : `
        <a href="/auth/login">Login</a>
        <a href="/auth/register">Register</a>
      `}
      <a href="/cart" class="nav-cart">🛒 Cart <span class="cart-count">${cartCount || 0}</span></a>
    </div>
  </nav>
  <main>${content}</main>
</body>
</html>`;
}

module.exports = router;
