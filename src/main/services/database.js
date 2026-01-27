import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'pasteleria.db');
const db = new Database(dbPath);

export function initDB() {
  // Tabla de Productos 
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, price REAL, category TEXT
  )`);

  // Tabla de Ventas (Cabecera)
  db.exec(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de Líneas de Venta (Detalle)
  db.exec(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    qty REAL,
    price REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id)
  )`);

  // Insertar algunos productos de prueba si la tabla está vacía
  const count = db.prepare('SELECT count(*) as count FROM products').get();
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO products (name, price, category) VALUES (?, ?, ?)');
    insert.run('Croissant', 1.50, 'Bollería');
    insert.run('Tarta de Fresa', 15.00, 'Tartas');
    insert.run('Barra de Pan', 1.10, 'Panadería');
  }
}
// Añade esto a tu database.js
export function saveSale(cart, total) {
  const transaction = db.transaction((cartItems, totalAmount) => {
    const sale = db.prepare('INSERT INTO sales (total) VALUES (?)').run(totalAmount);
    const saleId = sale.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, qty, price) 
      VALUES (?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      insertItem.run(saleId, item.id, item.qty, item.price);
    }
    return saleId;
  });

  return transaction(cart, total);
}

export function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}
// Obtener total de ventas de HOY
export function getDailySales() {
  const row = db.prepare(`
    SELECT SUM(total) as dailyTotal 
    FROM sales 
    WHERE date >= date('now', 'start of day')
  `).get();
  return row.dailyTotal || 0;
}

// Añadir un nuevo producto
export function addProduct(p) {
  return db.prepare('INSERT INTO products (name, price, category) VALUES (?, ?, ?)')
    .run(p.name, p.price, p.category);
}