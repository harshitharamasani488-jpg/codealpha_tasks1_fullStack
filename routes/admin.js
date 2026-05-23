const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// GET /admin — dashboard
router.get('/', (req, res) => {
  const stats = {
    products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status != 'cancelled'").get().r,
  };
  const recentOrders = db.prepare(`
    SELECT o.*, u.name as user_name, u.email
    FROM orders o JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();
  res.send(renderAdmin({ stats, recentOrders, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// GET /admin/orders — all orders
router.get('/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  res.send(renderAdminOrders({ orders, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// POST /admin/orders/:id/status — update order status
router.post('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (valid.includes(status)) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  res.redirect('/admin/orders');
});

// GET /admin/products — manage products
router.get('/products', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.id DESC
  `).all();
  res.send(renderAdminProducts({ products, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// GET /admin/products/new
router.get('/products/new', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.send(renderProductForm({ product: null, categories, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// POST /admin/products
router.post('/products', (req, res) => {
  const { name, description, price, stock, image_url, category_id, featured } = req.body;
  db.prepare('INSERT INTO products (name, description, price, stock, image_url, category_id, featured) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, description, parseFloat(price), parseInt(stock), image_url || '/images/placeholder.jpg', category_id, featured ? 1 : 0);
  res.redirect('/admin/products');
});

// GET /admin/products/:id/edit
router.get('/products/:id/edit', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  const categories = db.prepare('SELECT * FROM categories').all();
  if (!product) return res.redirect('/admin/products');
  res.send(renderProductForm({ product, categories, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// POST /admin/products/:id
router.post('/products/:id', (req, res) => {
  const { name, description, price, stock, image_url, category_id, featured } = req.body;
  db.prepare('UPDATE products SET name=?, description=?, price=?, stock=?, image_url=?, category_id=?, featured=? WHERE id=?')
    .run(name, description, parseFloat(price), parseInt(stock), image_url, category_id, featured ? 1 : 0, req.params.id);
  res.redirect('/admin/products');
});

// POST /admin/products/:id/delete
router.post('/products/:id/delete', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
});

const statusColors = { pending: '#f59e0b', confirmed: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444' };

function renderAdmin({ stats, recentOrders, user, cartCount }) {
  return baseLayout('Admin Dashboard', `
    <div class="container">
      <div class="admin-header">
        <h1>⚙️ Admin Dashboard</h1>
        <div class="admin-nav-links">
          <a href="/admin/products" class="btn btn-outline">Manage Products</a>
          <a href="/admin/orders" class="btn btn-outline">Manage Orders</a>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-val">${stats.products}</div><div class="stat-label">Products</div></div>
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${stats.users}</div><div class="stat-label">Users</div></div>
        <div class="stat-card"><div class="stat-icon">🛒</div><div class="stat-val">${stats.orders}</div><div class="stat-label">Orders</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-val">$${stats.revenue.toFixed(2)}</div><div class="stat-label">Revenue</div></div>
      </div>
      <div class="admin-section">
        <h2>Recent Orders</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${recentOrders.map(o => `
                <tr>
                  <td>#${o.id}</td>
                  <td>${o.user_name}<br><small>${o.email}</small></td>
                  <td>$${o.total.toFixed(2)}</td>
                  <td><span class="badge" style="background:${statusColors[o.status]}20;color:${statusColors[o.status]}">${o.status}</span></td>
                  <td>${new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `, user, cartCount);
}

function renderAdminOrders({ orders, user, cartCount }) {
  return baseLayout('Manage Orders', `
    <div class="container">
      <h1 class="page-title">📋 Manage Orders</h1>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td>#${o.id}</td>
                <td>${o.user_name}</td>
                <td>$${o.total.toFixed(2)}</td>
                <td><span class="badge" style="background:${statusColors[o.status]}20;color:${statusColors[o.status]}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>
                  <form method="POST" action="/admin/orders/${o.id}/status" style="display:flex;gap:6px;align-items:center">
                    <select name="status" class="sort-select" style="font-size:12px;padding:4px">
                      ${['pending','confirmed','shipped','delivered','cancelled'].map(s => `<option ${s===o.status?'selected':''} value="${s}">${s}</option>`).join('')}
                    </select>
                    <button type="submit" class="btn btn-primary" style="padding:4px 10px;font-size:12px">Update</button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `, user, cartCount);
}

function renderAdminProducts({ products, user, cartCount }) {
  return baseLayout('Manage Products', `
    <div class="container">
      <div class="admin-header">
        <h1 class="page-title">🏪 Manage Products</h1>
        <a href="/admin/products/new" class="btn btn-primary">+ Add Product</a>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th></tr></thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><img src="${p.image_url}" style="width:50px;height:50px;object-fit:cover;border-radius:8px"></td>
                <td>${p.name}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td><span class="${p.stock > 0 ? 'in-stock' : 'out-stock'}">${p.stock}</span></td>
                <td>${p.category_name || '—'}</td>
                <td style="display:flex;gap:6px">
                  <a href="/admin/products/${p.id}/edit" class="btn btn-outline" style="padding:4px 10px;font-size:12px">Edit</a>
                  <form method="POST" action="/admin/products/${p.id}/delete" onsubmit="return confirm('Delete this product?')">
                    <button type="submit" class="btn" style="padding:4px 10px;font-size:12px;background:#fee2e2;color:#ef4444;border:none">Delete</button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `, user, cartCount);
}

function renderProductForm({ product, categories, user, cartCount }) {
  const isEdit = !!product;
  return baseLayout(isEdit ? 'Edit Product' : 'New Product', `
    <div class="container">
      <h1 class="page-title">${isEdit ? '✏️ Edit Product' : '➕ Add Product'}</h1>
      <div class="form-card">
        <form method="POST" action="${isEdit ? `/admin/products/${product.id}` : '/admin/products'}">
          <div class="form-group">
            <label>Product Name</label>
            <input type="text" name="name" value="${product?.name || ''}" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea name="description" rows="4">${product?.description || ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Price ($)</label>
              <input type="number" name="price" value="${product?.price || ''}" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Stock</label>
              <input type="number" name="stock" value="${product?.stock || 0}" min="0" required>
            </div>
          </div>
          <div class="form-group">
            <label>Image URL</label>
            <input type="text" name="image_url" value="${product?.image_url || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select name="category_id">
                ${categories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:24px">
              <input type="checkbox" name="featured" id="featured" ${product?.featured ? 'checked' : ''} style="width:auto">
              <label for="featured" style="margin:0">Featured product</label>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update Product' : 'Add Product'}</button>
            <a href="/admin/products" class="btn btn-outline">Cancel</a>
          </div>
        </form>
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
  <title>${title} — Admin</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav class="navbar">
    <a href="/" class="nav-brand">🛍️ ShopZen</a>
    <div class="nav-links">
      <a href="/">Store</a>
      <a href="/admin" class="nav-admin">Dashboard</a>
      <a href="/admin/products">Products</a>
      <a href="/admin/orders">Orders</a>
      <a href="/auth/logout">Logout</a>
      <a href="/cart" class="nav-cart">🛒 <span class="cart-count">${cartCount || 0}</span></a>
    </div>
  </nav>
  <main>${content}</main>
</body>
</html>`;
}

module.exports = router;
