const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'store.db');

// Synchronous wrapper built on sql.js
// We load/save the DB file on disk for persistence
let _db = null;
let _SQL = null;

function getDb() { return _db; }

async function initDb() {
  const SQL = await initSqlJs();
  _SQL = SQL;
  
  let fileBuffer;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }
  
  _db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  
  // Enable foreign keys
  _db.run('PRAGMA foreign_keys = ON;');
  
  // Create tables
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      image_url TEXT DEFAULT '/images/placeholder.jpg',
      category_id INTEGER,
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      shipping_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );
  `);
  
  saveDb();
  return _db;
}

function saveDb() {
  if (_db) {
    const data = _db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

// Sync-style wrappers to match better-sqlite3 API used in routes
const db = {
  prepare(sql) {
    return {
      get(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const rows = [];
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run(...params) {
        _db.run(sql, params);
        const lastRow = _db.exec('SELECT last_insert_rowid() as id')[0];
        const rowid = lastRow ? lastRow.values[0][0] : null;
        saveDb();
        return { lastInsertRowid: rowid };
      },
    };
  },
  exec(sql) {
    _db.run(sql);
    saveDb();
  },
  _raw() { return _db; },
};

module.exports = { db, initDb, saveDb };
