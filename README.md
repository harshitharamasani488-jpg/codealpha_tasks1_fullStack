# 🛍️ ShopZen — E-Commerce Store

A full-featured e-commerce web application built with **Express.js**, **SQLite**, and vanilla **HTML/CSS/JS**.

## Features

- 🏪 Product listings with search, filter by category, and sorting
- 📦 Product detail pages with related products
- 🛒 Shopping cart (session-based, no login required)
- 💳 Checkout with order placement
- 👤 User registration & login (bcrypt hashed passwords)
- 📋 Order history & order detail pages
- ⚙️ Admin dashboard (manage products, view/update orders)
- 📱 Fully responsive design

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@store.com | admin123 |
| Customer | jane@example.com | customer123 |

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (via better-sqlite3)
- **Sessions**: express-session + connect-sqlite3
- **Auth**: bcryptjs
- **Frontend**: HTML, CSS, Vanilla JavaScript

---

## 🚀 How to Run in VS Code

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- [VS Code](https://code.visualstudio.com/)

### Step-by-Step

1. **Open the project in VS Code**
   ```
   File → Open Folder → select the ecommerce folder
   ```

2. **Open the integrated terminal**
   ```
   Terminal → New Terminal  (or Ctrl + `)
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Seed the database with sample data**
   ```bash
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   > Or use `npm start` for production mode (no auto-restart)

6. **Open in browser**
   ```
   http://localhost:3000
   ```

### Recommended VS Code Extensions
- **REST Client** — test API endpoints
- **SQLite Viewer** — browse the database file
- **nodemon** (installed as devDependency, runs via `npm run dev`)

---

## 📂 Project Structure

```
ecommerce/
├── server.js              # Main Express app
├── package.json
├── db/
│   ├── database.js        # DB init & schema
│   ├── seed.js            # Sample data seeder
│   └── store.db           # SQLite database (auto-created)
├── routes/
│   ├── auth.js            # Login / Register / Logout
│   ├── products.js        # Homepage & product detail
│   ├── cart.js            # Cart & Checkout
│   ├── orders.js          # Order history & detail
│   └── admin.js           # Admin panel
├── middleware/
│   └── auth.js            # Session & auth helpers
└── public/
    ├── css/style.css      # All styles
    └── images/            # Static images
```

---

## ☁️ How to Upload to GitHub

### First Time Setup

1. **Create a GitHub account** at https://github.com if you don't have one

2. **Install Git** from https://git-scm.com/downloads

3. **Configure Git** (run once on your machine):
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

4. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Name it `shopzen-ecommerce`
   - Keep it public or private
   - **Do NOT** initialize with README (we already have one)
   - Click **Create repository**

5. **Initialize Git in your project folder** (in VS Code terminal):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ShopZen e-commerce store"
   ```

6. **Connect and push to GitHub** (replace YOUR_USERNAME):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/shopzen-ecommerce.git
   git branch -M main
   git push -u origin main
   ```

7. **Done!** Your code is now on GitHub 🎉

### Pushing Future Changes

```bash
git add .
git commit -m "Describe your changes here"
git push
```

---

## 🌐 Deploy to the Web (Optional)

### Railway (Free, easy)
1. Go to https://railway.app
2. Connect your GitHub repo
3. It auto-detects Node.js and deploys!

### Render (Free tier)
1. Go to https://render.com
2. New → Web Service → connect GitHub repo
3. Build command: `npm install && npm run seed`
4. Start command: `npm start`
