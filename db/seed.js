const { db, initDb } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDb();
  console.log('🌱 Seeding database...');

  const categories = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Home & Garden', slug: 'home-garden' },
    { name: 'Sports', slug: 'sports' },
  ];
  categories.forEach(c => db.prepare('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)').run(c.name, c.slug));

  const products = [
    { name: 'Wireless Headphones', description: 'Premium noise-cancelling wireless headphones with 30hr battery life and crystal-clear audio.', price: 89.99, stock: 50, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', category_id: 1, featured: 1 },
    { name: 'Smart Watch Pro', description: 'Feature-packed smartwatch with health monitoring, GPS, and 7-day battery life.', price: 199.99, stock: 30, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', category_id: 1, featured: 1 },
    { name: 'Laptop Stand', description: 'Ergonomic aluminum laptop stand with adjustable height for better posture.', price: 39.99, stock: 100, image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80', category_id: 1, featured: 0 },
    { name: 'Mechanical Keyboard', description: 'Compact TKL mechanical keyboard with RGB backlight and tactile switches.', price: 79.99, stock: 45, image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80', category_id: 1, featured: 1 },
    { name: 'Running Shoes', description: 'Lightweight responsive running shoes with advanced cushioning technology.', price: 119.99, stock: 60, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', category_id: 4, featured: 1 },
    { name: 'Yoga Mat', description: 'Non-slip premium yoga mat with alignment lines, 6mm thick for joint comfort.', price: 34.99, stock: 80, image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&q=80', category_id: 4, featured: 0 },
    { name: 'Classic White T-Shirt', description: 'Premium 100% cotton crew-neck tee, pre-shrunk with a relaxed modern fit.', price: 24.99, stock: 200, image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', category_id: 2, featured: 0 },
    { name: 'Denim Jacket', description: 'Classic washed denim jacket with a slim fit, perfect for layering.', price: 69.99, stock: 40, image_url: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=400&q=80', category_id: 2, featured: 1 },
    { name: 'Ceramic Plant Pot', description: 'Handcrafted ceramic pot with drainage hole, available in matte white finish.', price: 19.99, stock: 120, image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80', category_id: 3, featured: 0 },
    { name: 'Scented Candle Set', description: 'Set of 3 premium soy wax candles in calming lavender, vanilla, and cedar scents.', price: 44.99, stock: 75, image_url: 'https://images.unsplash.com/photo-1602607144952-d58858c8a77e?w=400&q=80', category_id: 3, featured: 0 },
    { name: 'Bluetooth Speaker', description: 'Waterproof portable speaker with 360 sound and 24hr playtime.', price: 59.99, stock: 55, image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', category_id: 1, featured: 1 },
    { name: 'Water Bottle', description: 'Insulated stainless steel bottle keeps drinks cold 24h or hot 12h.', price: 29.99, stock: 150, image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80', category_id: 4, featured: 0 },
  ];

  const ins = db.prepare('INSERT OR IGNORE INTO products (name, description, price, stock, image_url, category_id, featured) VALUES (?, ?, ?, ?, ?, ?, ?)');
  products.forEach(p => ins.run(p.name, p.description, p.price, p.stock, p.image_url, p.category_id, p.featured));

  const adminPass = bcrypt.hashSync('admin123', 10);
  const custPass = bcrypt.hashSync('customer123', 10);
  db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin User', 'admin@store.com', adminPass, 'admin');
  db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Jane Doe', 'jane@example.com', custPass, 'customer');

  console.log('✅ Seeding complete!');
  console.log('   Admin: admin@store.com / admin123');
  console.log('   Customer: jane@example.com / customer123');
  process.exit(0);
}

seed().catch(console.error);
