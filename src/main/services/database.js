import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'pasteleria.db');
const db = new Database(dbPath);


export function initDB() {
  db.pragma('journal_mode = WAL');
  // Tabla de Categorías
  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    icon TEXT -- Para guardar el emoji o nombre de icono
  )`);
  // Nueva tabla de configuración
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // 2. Tabla de Productos (con clave foránea)
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL,
    category_id INTEGER,
    FOREIGN KEY(category_id) REFERENCES categories(id)
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

// Tabla de Sesiones de Caja
  db.exec(`
  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    initial_cash REAL NOT NULL, -- Lo que hay en caja al empezar
    closing_cash REAL,          -- Lo que el empleado cuenta al salir
    status TEXT DEFAULT 'OPEN'  -- 'OPEN', 'CLOSED'
  )
`);

  try {
    //db.prepare("ALTER TABLE products ADD COLUMN active INTEGER DEFAULT 1").run();
    //db.prepare("ALTER TABLE products ADD COLUMN category_id INTEGER").run();
    db.prepare("ALTER TABLE products ADD COLUMN image_path TEXT").run();
    db.prepare("ALTER TABLE categories ADD COLUMN image_path TEXT").run();
    console.log("las tablas ya tienen las columnas necesarias.");
    // Aseguramos que las ventas apunten a la sesión, no solo a la fecha
    db.prepare("ALTER TABLE sales ADD COLUMN session_id INTEGER").run();
  } catch (error) {
    console.log("La columna ya existe.", error);
  }

  // Insertar categorías por defecto si la tabla está vacía
  const countCategories = db.prepare('SELECT COUNT(*) as total FROM categories').get();
  if (countCategories.total === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
    insertCat.run('Bollería', '🥐');
    insertCat.run('Pastelería', '🍰');
    insertCat.run('Panadería', '🥖');
    insertCat.run('Cafetería', '☕');
  }
  // Insertar algunos productos de prueba si la tabla está vacía
  const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (countProducts.count === 0) {
    // ⚠️ Fíjate en el nombre de la columna: category_id
    const insert = db.prepare('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)');

    insert.run('Croissant', 1.50, 1);       // 1 = Bollería
    insert.run('Tarta de Fresa', 15.00, 2); // 2 = Pastelería
    insert.run('Barra de Pan', 1.10, 3);    // 3 = Panadería
    insert.run('Café con Leche', 1.40, 4);  // 4 = Cafetería


  }

  // Insertar datos por defecto si está vacía
  const count = db.prepare('SELECT COUNT(*) as total FROM settings').get();
  if (count.total === 0) {
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insert.run('business_name', 'DULCE PASTELERÍA SL');
    insert.run('business_nif', 'B-12345678');
    insert.run('business_address', 'Calle del Azúcar, 12 - Madrid');
    insert.run('business_phone', '+34 912 345 678');
    insert.run('ticket_footer', '¡Gracias por endulzarte con nosotros!');
  }
  console.log("✅ Base de datos sembrada con productos iniciales");
}
//#region Funciones de base de datos para categorías

// Añadir categoría con validación de nombre único
export function addCategory(cat) {
  // Comprobar si ya existe
  const exists = db.prepare("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)")
    .get(cat.name);
  if (exists) throw new Error("Ya existe una categoría con ese nombre");

  return db.prepare(`
    INSERT INTO categories (name, icon, image_path) VALUES (?, ?, ?)
  `).run(cat.name, cat.icon, cat.image_path);
}

//obtener categorías
export function getCategories() {
  return db.prepare('SELECT * FROM categories').all();
}

// Obtener solo categorías que tengan al menos un producto activo
export function getActiveCategories() {
  return db.prepare(`
    SELECT DISTINCT c.* FROM categories c
    INNER JOIN products p ON c.id = p.category_id
    WHERE p.active = 1
  `).all();
}

//  Actualizar categoría existente
export function updateCategory(cat) {
  return db.prepare(`
    UPDATE categories SET name = ?, icon = ?, image_path = ? WHERE id = ?
  `).run(cat.name, cat.icon, cat.image_path, cat.id);
}
// Borrar solo si no tiene productos
export function deleteCategory(id) {
  const hasProducts = db.prepare("SELECT id FROM products WHERE category_id = ? LIMIT 1").get(id);
  if (hasProducts) throw new Error("No puedes borrar una categoría que contiene productos");

  return db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}
//#endregion



export function saveSale({ cart, total }) { // <--- Desestructuramos aquí
  const transaction = db.transaction((cartItems, totalAmount) => {
    const stmt = db.prepare('INSERT INTO sales (total) VALUES (?)').run(totalAmount);
    const saleId = stmt.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, qty, price) 
      VALUES (?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      insertItem.run(saleId, item.id, item.qty, item.price);
    }

    return saleId;
  });

  // Pasamos el array y el número por separado a la transacción interna
  const id = transaction(cart, total);
  return { id }; // Devolvemos un objeto con el ID
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
  return db.prepare('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)')
    .run(p.name, p.price, p.category_id);
}
// Actualizar el precio de un producto por su nombre
export function updateProduct(p) {
  const stmt = db.prepare(`
    UPDATE products 
    SET name = ?, price = ?, category_id = ?, image_path = ?
    WHERE id = ?
  `);
  return stmt.run(p.name, p.price, p.category_id, p.image_path, p.id);
}

//Cambiar el estado activo/inactivo de un producto
export function toggleProductStatus(id, status) {
  // status será 0 para desactivar, 1 para activar
  const stmt = db.prepare('UPDATE products SET active = ? WHERE id = ?');
  return stmt.run(status, id);
}

// Obtener productos con el nombre de su categoría FUNCION PARA ADMINISTRACION: MUESTRA TODOS LOS PRODUCTOS
export function getProductsWithCategory() {
  return db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.id
  `).all();
}

// Func para obtener productos activos con el nombre de su categoría Para SalesView: Muestra solo lo disponible
export function getActiveProductsWithCategory() {
  return db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    INNER JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
  `).all();
}
// Función para obtener la configuración
export function getSettings() {
  const rows = db.prepare('SELECT * FROM settings').all();
  // Convertimos array de {key, value} a un objeto fácil de usar: { business_name: '...', ... }
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
}

export function updateSettings(settings) {
  const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  // Ejecutamos una actualización por cada campo
  Object.entries(settings).forEach(([key, value]) => {
    stmt.run(value, key);
  });

  return { success: true };
}

//==================================//
//####### Historal de ventas #######//
//==================================//
// 1. Obtener lista general de ventas (resumen)
export function getAllSales() {
  return db.prepare(`
    SELECT id, total, date 
    FROM sales 
    ORDER BY date DESC
  `).all();
}

// 2. Obtener los productos de una venta específica (para el detalle)
export function getSaleItems(saleId) {
  return db.prepare(`
    SELECT si.*, p.name 
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(saleId);
}

// 3. Productos más vendidos
export function getTopProducts(limit = 5) {
  return db.prepare(`
    SELECT p.name, SUM(si.qty) as total_qty
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.id
    ORDER BY total_qty DESC
    LIMIT ?
  `).all(limit);
}


// lógica de base de datos
export function getSalesByHour() {
  return db.prepare(`
    SELECT 
      strftime('%H', date) as hour,
      COUNT(id) as count,
      SUM(total) as total_amount
    FROM sales
    GROUP BY hour
    ORDER BY total_amount DESC
  `).all();
}

// 5. Ventas por rango de fechas (Día, Mes, Año o Personalizado)
export function getSalesByRange(startDate, endDate) {
  return db.prepare(`
    SELECT id, total, date 
    FROM sales 
    WHERE date BETWEEN ? AND ?
    ORDER BY date DESC
  `).all(startDate, endDate);
}

// 6. Datos para gráfico de ventas diarias en un rango
export function getDailySalesChart(startDate, endDate) {
  return db.prepare(`
    SELECT date(date) as day, SUM(total) as daily_total
    FROM sales
    WHERE date BETWEEN ? AND ?
    GROUP BY day
    ORDER BY day ASC
  `).all(startDate, endDate);
}


//==================================//
//####### cierre de caja #########//
//==================================//
export function getActiveSession() {
  // Buscamos la sesión que no tenga end_time o cuyo status sea OPEN
  return db.prepare("SELECT * FROM cash_sessions WHERE status = 'OPEN'").get();
}

export function openSession({ user_name, initial_cash }) {
  const stmt = db.prepare(`
    INSERT INTO cash_sessions (user_name, initial_cash, status, start_time)
    VALUES (?, ?, 'OPEN', CURRENT_TIMESTAMP)
  `);
  return stmt.run(user_name, initial_cash);
}

export function closeSession({ session_id, closing_cash }) {
 try {
    const stmt = db.prepare(`
      UPDATE cash_sessions 
      SET end_time = CURRENT_TIMESTAMP, 
          closing_cash = ?, 
          status = 'CLOSED' 
      WHERE id = ? AND status = 'OPEN'
    `);
    const info = stmt.run(closing_cash, session_id);
    return { success: info.changes > 0 }; // Devuelve un objeto simple, no el statement
  } catch (error) {
    console.error("Error SQL en closeSession:", error);
    throw error;
  }
}