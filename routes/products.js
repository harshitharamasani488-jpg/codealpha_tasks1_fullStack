const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET / — homepage with product listings
router.get('/', (req, res) => {
  const { category, search, sort } = req.query;
  const categories = db.prepare('SELECT * FROM categories').all();

  let query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    query += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const sortMap = {
    'price-asc': 'p.price ASC',
    'price-desc': 'p.price DESC',
    'newest': 'p.created_at DESC',
    'name': 'p.name ASC',
  };
  query += ` ORDER BY ${sortMap[sort] || 'p.featured DESC, p.created_at DESC'}`;

  const products = db.prepare(query).all(...params);
  const featured = !search && !category
    ? db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.featured = 1 LIMIT 4').all()
    : [];

  res.send(renderHome({ products, featured, categories, category, search, sort, user: res.locals.user, cartCount: res.locals.cartCount }));
});

// GET /products/:id — product detail
router.get('/products/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) return res.status(404).send('<h1>Product not found</h1>');

  const related = db.prepare(`
    SELECT * FROM products
    WHERE category_id = ? AND id != ?
    LIMIT 4
  `).all(product.category_id, product.id);

  res.send(renderProduct({ product, related, user: res.locals.user, cartCount: res.locals.cartCount }));
});

function renderHome({ products, featured, categories, category, search, sort, user, cartCount }) {
  const showHero = !search && !category;
  return baseLayout('ShopZen — Modern Store', `
    ${showHero ? `
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">New Season Arrivals</div>
        <h1>Discover Products<br><span class="hero-accent">You'll Love</span></h1>
        <p>Curated collection of premium products at unbeatable prices.</p>
        <div class="hero-actions">
          <a href="#products" class="btn btn-primary btn-lg">Shop Now</a>
          <a href="/auth/register" class="btn btn-outline btn-lg">Join for Free</a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-float">🛍️</div>
      </div>
    </section>
    ` : ''}

    ${featured.length && showHero ? `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>Featured Products</h2>
          <span class="section-tag">Staff Picks</span>
        </div>
        <div class="product-grid">
          ${featured.map(p => productCard(p)).join('')}
        </div>
      </div>
    </section>
    ` : ''}

    <section class="section" id="products">
      <div class="container">
        <div class="shop-layout">
          <aside class="sidebar">
            <div class="sidebar-card">
              <h3>Categories</h3>
              <ul class="cat-list">
                <li><a href="/" class="${!category ? 'active' : ''}">All Products <span>${db.prepare('SELECT COUNT(*) as c FROM products').get().c}</span></a></li>
                ${categories.map(c => `
                  <li><a href="/?category=${c.slug}" class="${category === c.slug ? 'active' : ''}">
                    ${c.name}
                    <span>${db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(c.id).c}</span>
                  </a></li>
                `).join('')}
              </ul>
            </div>
          </aside>
          <div class="shop-main">
            <div class="shop-toolbar">
              <form method="GET" action="/" class="search-bar">
                <input type="text" name="search" value="${search || ''}" placeholder="Search products..." ${category ? `<input type="hidden" name="category" value="${category}">` : ''}>
                <button type="submit">🔍</button>
              </form>
              <select onchange="window.location.href='?${category ? `category=${category}&` : ''}sort='+this.value" class="sort-select">
                <option value="">Sort by</option>
                <option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest</option>
                <option value="name" ${sort === 'name' ? 'selected' : ''}>Name A–Z</option>
              </select>
            </div>
            <p class="result-count">${products.length} product${products.length !== 1 ? 's' : ''} found</p>
            ${products.length ? `
              <div class="product-grid">
                ${products.map(p => productCard(p)).join('')}
              </div>
            ` : '<div class="empty-state">😕 No products found. <a href="/">Clear filters</a></div>'}
          </div>
        </div>
      </div>
    </section>
  `, user, cartCount);
}

function renderProduct({ product, related, user, cartCount }) {
  return baseLayout(product.name, `
    <div class="container">
      <div class="breadcrumb">
        <a href="/">Home</a> › <a href="/?category=${product.category_name}">${product.category_name}</a> › ${product.name}
      </div>
      <div class="product-detail">
        <div class="product-detail-image">
          <img src="${product.image_url}" alt="${product.name}" loading="lazy">
          ${product.featured ? '<span class="badge-featured">⭐ Featured</span>' : ''}
        </div>
        <div class="product-detail-info">
          <div class="product-category-tag">${product.category_name}</div>
          <h1>${product.name}</h1>
          <div class="product-price-large">$${product.price.toFixed(2)}</div>
          <div class="product-stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}">
            ${product.stock > 0 ? `✓ In Stock (${product.stock} available)` : '✗ Out of Stock'}
          </div>
          <p class="product-description">${product.description}</p>
          ${product.stock > 0 ? `
            <div class="quantity-add">
              <div class="qty-control">
                <button onclick="changeQty(-1)" class="qty-btn">−</button>
                <input type="number" id="qty" value="1" min="1" max="${product.stock}" class="qty-input">
                <button onclick="changeQty(1)" class="qty-btn">+</button>
              </div>
              <button onclick="addToCart(${product.id})" class="btn btn-primary btn-lg">🛒 Add to Cart</button>
            </div>
          ` : '<button class="btn btn-disabled btn-lg" disabled>Out of Stock</button>'}
          <div class="product-meta">
            <span>🏷️ ${product.category_name}</span>
            <span>📦 Free shipping over $50</span>
            <span>↩️ 30-day returns</span>
          </div>
        </div>
      </div>
      ${related.length ? `
        <section class="related-section">
          <h2>You May Also Like</h2>
          <div class="product-grid">
            ${related.map(p => productCard(p)).join('')}
          </div>
        </section>
      ` : ''}
    </div>
    <script>
      function changeQty(delta) {
        const input = document.getElementById('qty');
        const newVal = Math.max(1, Math.min(${product.stock}, parseInt(input.value) + delta));
        input.value = newVal;
      }
      function addToCart(id) {
        const qty = parseInt(document.getElementById('qty').value);
        fetch('/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: id, qty })
        }).then(r => r.json()).then(d => {
          if (d.success) {
            document.querySelector('.cart-count').textContent = d.cartCount;
            showToast('Added to cart! 🎉');
          }
        });
      }
      function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
      }
    </script>
  `, user, cartCount);
}

function productCard(p) {
  return `
    <div class="product-card">
      <a href="/products/${p.id}" class="product-card-img-wrap">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy">
        ${p.featured ? '<span class="card-badge">⭐ Featured</span>' : ''}
      </a>
      <div class="product-card-body">
        <div class="card-category">${p.category_name || ''}</div>
        <h3><a href="/products/${p.id}">${p.name}</a></h3>
        <p class="card-desc">${p.description ? p.description.substring(0, 80) + '...' : ''}</p>
        <div class="card-footer">
          <span class="card-price">$${p.price.toFixed(2)}</span>
          <button onclick="quickAdd(event, ${p.id})" class="btn-cart" title="Add to cart">🛒</button>
        </div>
      </div>
    </div>
  `;
}

function baseLayout(title, content, user, cartCount) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
        <a href="/auth/logout" class="nav-logout">Logout (${user.name.split(' ')[0]})</a>
      ` : `
        <a href="/auth/login">Login</a>
        <a href="/auth/register">Register</a>
      `}
      <a href="/cart" class="nav-cart">
        🛒 Cart <span class="cart-count">${cartCount || 0}</span>
      </a>
    </div>
  </nav>
  <main>${content}</main>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div><h4>🛍️ ShopZen</h4><p>Premium products, effortless shopping.</p></div>
        <div><h4>Shop</h4><a href="/">All Products</a><a href="/?category=electronics">Electronics</a><a href="/?category=clothing">Clothing</a></div>
        <div><h4>Account</h4><a href="/auth/login">Login</a><a href="/auth/register">Register</a><a href="/orders">Orders</a></div>
      </div>
      <p class="footer-copy">© 2024 ShopZen. Built with Express.js & SQLite.</p>
    </div>
  </footer>
  <script>
    function quickAdd(e, id) {
      e.preventDefault();
      fetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, qty: 1 })
      }).then(r => r.json()).then(d => {
        if (d.success) {
          document.querySelector('.cart-count').textContent = d.cartCount;
          showToast('Added to cart! 🎉');
        }
      });
    }
    function showToast(msg) {
      const t = document.createElement('div');
      t.className = 'toast'; t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.classList.add('show'), 10);
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
    }
  </script>
</body>
</html>`;
}

const dbRef = db;
router.dbRef = dbRef;

module.exports = router;
