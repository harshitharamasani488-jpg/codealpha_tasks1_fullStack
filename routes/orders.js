const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /orders — list user orders
router.get('/', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.session.userId);

  res.send(renderOrders({ orders, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// GET /orders/:id — order detail
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);

  if (!order) return res.status(404).send('<h1>Order not found</h1>');

  const items = db.prepare(`
    SELECT oi.*, p.name, p.image_url
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order.id);

  const success = req.query.success === '1';

  res.send(renderOrderDetail({ order, items, success, user: res.locals.user, cartCount: res.locals.cartCount }));
});

const statusColors = { pending: '#f59e0b', confirmed: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444' };

function renderOrders({ orders, user, cartCount }) {
  return baseLayout('My Orders', `
    <div class="container">
      <h1 class="page-title">📦 My Orders</h1>
      ${orders.length === 0 ? `
        <div class="empty-cart">
          <div class="empty-icon">📭</div>
          <h2>No orders yet</h2>
          <p>Start shopping to see your orders here.</p>
          <a href="/" class="btn btn-primary">Shop Now</a>
        </div>
      ` : `
        <div class="orders-list">
          ${orders.map(o => `
            <a href="/orders/${o.id}" class="order-card">
              <div class="order-header">
                <div>
                  <span class="order-id">Order #${o.id}</span>
                  <span class="order-date">${new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <span class="order-status" style="background:${statusColors[o.status]}20;color:${statusColors[o.status]}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
              </div>
              <div class="order-meta">
                <span>🛍️ ${o.item_count} item${o.item_count !== 1 ? 's' : ''}</span>
                <span class="order-total">$${o.total.toFixed(2)}</span>
              </div>
            </a>
          `).join('')}
        </div>
      `}
    </div>
  `, user, cartCount);
}

function renderOrderDetail({ order, items, success, user, cartCount }) {
  return baseLayout(`Order #${order.id}`, `
    <div class="container">
      ${success ? `
        <div class="success-banner">
          <div class="success-icon">🎉</div>
          <h2>Order Placed Successfully!</h2>
          <p>Thank you for your purchase. Your order is being processed.</p>
        </div>
      ` : ''}
      <div class="order-detail-header">
        <div>
          <h1>Order #${order.id}</h1>
          <p class="order-date">Placed on ${new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <span class="order-status-lg" style="background:${statusColors[order.status]}20;color:${statusColors[order.status]}">
          ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>
      <div class="order-layout">
        <div class="order-items-section">
          <h2>Items Ordered</h2>
          ${items.map(item => `
            <div class="order-item">
              <img src="${item.image_url}" alt="${item.name}">
              <div class="order-item-details">
                <h3>${item.name}</h3>
                <p>Quantity: ${item.quantity} × $${item.price.toFixed(2)}</p>
              </div>
              <span class="order-item-total">$${(item.quantity * item.price).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="order-sidebar">
          <div class="order-summary-card">
            <h3>Order Summary</h3>
            <div class="summary-line"><span>Items (${items.reduce((s,i) => s+i.quantity, 0)})</span><span>$${(order.total - (order.total >= 50 ? 0 : 5.99)).toFixed(2)}</span></div>
            <div class="summary-line"><span>Shipping</span><span>${order.total >= 50 ? 'FREE' : '$5.99'}</span></div>
            <div class="summary-total"><span>Total</span><span>$${order.total.toFixed(2)}</span></div>
          </div>
          <div class="order-address-card">
            <h3>📍 Delivery Address</h3>
            <p>${order.shipping_address}</p>
          </div>
          <a href="/orders" class="btn btn-outline btn-full">← Back to Orders</a>
          <a href="/" class="btn btn-primary btn-full">Continue Shopping</a>
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
