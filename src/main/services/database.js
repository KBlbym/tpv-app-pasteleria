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
    icon TEXT 
  )`);

  // Tabla de configuración
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Tabla de Productos
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL,
    category_id INTEGER,
    active INTEGER DEFAULT 1,
    image_path TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  // Tabla de Ventas (CORREGIDA: Ahora incluye session_id desde el inicio)
  db.exec(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL,
    session_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES cash_sessions(id)
  )`);

  // Tabla de Líneas de Venta
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
      initial_cash REAL NOT NULL,
      closing_cash REAL,
      status TEXT DEFAULT 'OPEN'
    )
  `);

  // Mantenimiento de columnas para DBs ya existentes
  try {
    db.prepare("ALTER TABLE products ADD COLUMN image_path TEXT").run();
    db.prepare("ALTER TABLE categories ADD COLUMN image_path TEXT").run();
    db.prepare("ALTER TABLE sales ADD COLUMN session_id INTEGER").run();
    //db.prepare(`ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'CASH'`).run();
  } catch (e) { }

 try {
  db.prepare(`ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'CASH'`).run();
  console.log("Columna payment_method añadida con éxito.");
} catch (err) {
  if (err.message.includes("duplicate column name")) {
    // La columna ya existía, no hacemos nada
  } else {
    console.error("Error al actualizar tabla sales:", err);
  }
}

try {
  db.prepare(`ALTER TABLE sale_items ADD COLUMN name TEXT DEFAULT 'CASH'`).run();
  console.log("Columna name añadida con éxito.");
} catch (err) {
  if (err.message.includes("duplicate column name")) {
    // La columna ya existía, no hacemos nada
  } else {
    console.error("Error al actualizar tabla sale_items:", err);
  }
}

  // Sembrado de datos (Categorías)
  const countCategories = db.prepare('SELECT COUNT(*) as total FROM categories').get();
  if (countCategories.total === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
    insertCat.run('Bollería', '🥐');
    insertCat.run('Pastelería', '🍰');
    insertCat.run('Panadería', '🥖');
    insertCat.run('Cafetería', '☕');
  }

  // Sembrado de datos (Productos)
  const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (countProducts.count === 0) {
    const insert = db.prepare('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)');
    insert.run('Croissant', 1.50, 1);
    insert.run('Tarta de Fresa', 15.00, 2);
    insert.run('Barra de Pan', 1.10, 3);
    insert.run('Café con Leche', 1.40, 4);
  }

  // Sembrado de datos (Settings)
  const countSettings = db.prepare('SELECT COUNT(*) as total FROM settings').get();
  if (countSettings.total === 0) {
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insert.run('business_name', 'DULCE PASTELERÍA SL');
    insert.run('business_nif', 'B-12345678');
    insert.run('business_address', 'Calle del Azúcar, 12 - Madrid');
    insert.run('business_phone', '+34 912 345 678');
    insert.run('ticket_footer', '¡Gracias por endulzarte con nosotros!');
  }
}

// --- CATEGORÍAS ---
export function addCategory(cat) {
  const exists = db.prepare("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)").get(cat.name);
  if (exists) throw new Error("Ya existe una categoría con ese nombre");
  return db.prepare(`INSERT INTO categories (name, icon, image_path) VALUES (?, ?, ?)`).run(cat.name, cat.icon, cat.image_path);
}

export function getCategories() {
  return db.prepare('SELECT * FROM categories').all();
}

export function getActiveCategories() {
  return db.prepare(`
    SELECT DISTINCT c.* FROM categories c
    INNER JOIN products p ON c.id = p.category_id
    WHERE p.active = 1
  `).all();
}

export function updateCategory(cat) {
  return db.prepare(`UPDATE categories SET name = ?, icon = ?, image_path = ? WHERE id = ?`).run(cat.name, cat.icon, cat.image_path, cat.id);
}

export function deleteCategory(id) {
  const hasProducts = db.prepare("SELECT id FROM products WHERE category_id = ? LIMIT 1").get(id);
  if (hasProducts) throw new Error("No puedes borrar una categoría que contiene productos");
  return db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

// --- VENTAS (CORREGIDO) ---
// Aquí estaba el error: la función no aceptaba ni guardaba el session_id
// export function saveSale({ cart, total, session_id }) {
//   const transaction = db.transaction((cartItems, totalAmount, sessionId) => {
//     // Insertamos la venta vinculándola a la sesión activa
//     const stmt = db.prepare('INSERT INTO sales (total, session_id) VALUES (?, ?)').run(totalAmount, sessionId);
//     const saleId = stmt.lastInsertRowid;

//     const insertItem = db.prepare(`
//       INSERT INTO sale_items (sale_id, product_id, qty, price) 
//       VALUES (?, ?, ?, ?)
//     `);

//     for (const item of cartItems) {
//       insertItem.run(saleId, item.id, item.qty, item.price);
//     }

//     return saleId;
//   });

//   // Pasamos los 3 parámetros a la transacción
//   const id = transaction(cart, total, session_id);
//   return { id, success: true };
// }

export function saveSale(saleData) {
  console.log("Guardando venta con datos:", saleData);
  const { total, cart, session_id, payment_method, date } = saleData;

  // Creamos una transacción para asegurar que se guarde TODO o NADA
  const executeSale = db.transaction((saleItems) => {
    // 1. Insertamos la venta principal
    const saleInfo = db.prepare(`
      INSERT INTO sales (total, session_id, payment_method, date)
      VALUES (?, ?, ?, ?)
    `).run(total, session_id, payment_method, date || new Date().toISOString());

    const saleId = saleInfo.lastInsertRowid;

    // 2. Insertamos cada producto del carrito en la tabla sale_items
    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, name, qty, price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of saleItems) {
      insertItem.run(saleId, item.id, item.name, item.qty, item.price);
      
    }

    return saleId;
  });

  try {
    const id = executeSale(cart);
    return { success: true, id };
  } catch (error) {
    console.error("Error crítico en la transacción de venta:", error);
    return { success: false, error: error.message };
  }
}

// --- PRODUCTOS ---
export function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}

export function getDailySales() {
  const row = db.prepare(`SELECT SUM(s.total) as dailyTotal FROM sales s JOIN cash_sessions cs ON s.session_id = cs.id  WHERE cs.status != 'ARCHIVED'`).get();
  return row.dailyTotal || 0;
}

export function addProduct(p) {
  return db.prepare('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)')
    .run(p.name, p.price, p.category_id);
}

export function updateProduct(p) {
  const stmt = db.prepare(`UPDATE products SET name = ?, price = ?, category_id = ?, image_path = ? WHERE id = ?`);
  return stmt.run(p.name, p.price, p.category_id, p.image_path, p.id);
}

export function toggleProductStatus(id, status) {
  const stmt = db.prepare('UPDATE products SET active = ? WHERE id = ?');
  return stmt.run(status, id);
}

export function getProductsWithCategory() {
  return db.prepare(`SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id`).all();
}

export function getActiveProductsWithCategory() {
  return db.prepare(`SELECT p.*, c.name as category_name FROM products p INNER JOIN categories c ON p.category_id = c.id WHERE p.active = 1`).all();
}

// --- SETTINGS ---
export function getSettings() {
  const rows = db.prepare('SELECT * FROM settings').all();
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
}

export function updateSettings(settings) {
  const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  Object.entries(settings).forEach(([key, value]) => { stmt.run(value, key); });
  return { success: true };
}

// --- HISTORIAL ---
export function getAllSales() {
  return db.prepare(`SELECT id, total, date, payment_method FROM sales ORDER BY date DESC`).all();
}

export function getSaleItems(saleId) {
  return db.prepare(`SELECT si.*, p.name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?`).all(saleId);
}

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

export function getSalesByHour() {
  return db.prepare(`
    SELECT strftime('%H', date) as hour, COUNT(id) as count, SUM(total) as total_amount
    FROM sales
    GROUP BY hour
    ORDER BY total_amount DESC
  `).all();
}

export function getSalesByRange(startDate, endDate) {
  return db.prepare(`
    SELECT id, total, date, payment_method 
    FROM sales 
    WHERE date BETWEEN ? AND ? 
    ORDER BY date DESC
  `).all(startDate, endDate);
}

export function getDailySalesChart(startDate, endDate) {
  const n = 15;
 const ventas = db.prepare("SELECT * FROM sales WHERE total > ?").all(n);
  const row =  db.prepare(`SELECT date(date) as day, SUM(total) as daily_total FROM sales WHERE date BETWEEN ? AND ? GROUP BY day ORDER BY day ASC`).all(startDate, endDate);
  console.log("Dato de ventas: " ,ventas);
  console.log("Dato de chart: " ,row);
}



// --- SESIONES Y CIERRE ---
export function getActiveSession() {
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
    return { success: info.changes > 0 };
  } catch (error) {
    console.error("Error SQL en closeSession:", error);
    throw error;
  }
}
export function getActiveSessionSales() {
  const session = getActiveSession();
  if (!session) return 0;

  const row = db.prepare(`
    SELECT SUM(total) as sessionTotal
    FROM sales
    WHERE session_id = ?
  `).get(session.id);
  return row.sessionTotal || 0;
}

export function getZReportData() {
  // Obtenemos sesiones cerradas
  const sessions = db.prepare(`
    SELECT id, user_name, initial_cash, closing_cash, (closing_cash - initial_cash) as net_cash
    FROM cash_sessions 
    WHERE status = 'CLOSED'
  `).all();

  if (sessions.length === 0) {
    return { sessions: [], total_sales: 0, sales_count: 0, date: new Date().toISOString() };
  }

  const sessionIds = sessions.map(s => s.id).join(',');

  const salesSummary = db.prepare(`
    SELECT SUM(total) as total_sales, COUNT(*) as count 
    FROM sales 
    WHERE session_id IN (${sessionIds})
  `).get();

  return {
    sessions,
    total_sales: salesSummary.total_sales || 0,
    sales_count: salesSummary.count || 0,
    date: new Date().toISOString()
  };
}


export function getXReportData(sessionId) {
  const session = db.prepare(`
    SELECT id, user_name, start_time, end_time, initial_cash, closing_cash 
    FROM cash_sessions 
    WHERE id = ?
  `).get(sessionId);

  const sales = db.prepare(`
    SELECT IFNULL(SUM(total), 0) as total_sales, COUNT(*) as count 
    FROM sales 
    WHERE session_id = ?
  `).get(sessionId);

  return {
    ...session,
    total_sales: sales.total_sales,
    sales_count: sales.count,
    expected_cash: session.initial_cash + sales.total_sales
  };
}

export function archiveSessions(sessionIds) {
  try {
    // sessionIds será un array de números [1, 2, 3...]
    const placeholders = sessionIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE cash_sessions 
      SET status = 'ARCHIVED' 
      WHERE id IN (${placeholders})
    `);

    const info = stmt.run(...sessionIds);
    return { success: true, count: info.changes };
  } catch (error) {
    console.error("Error al archivar sesiones:", error);
    throw error;
  }
}

export function getArchivedReports() {
  // Obtenemos un resumen de los cierres agrupados por fecha de fin
  // Esto nos dará una lista de qué días se cerraron y cuánto se vendió
  return db.prepare(`
    SELECT 
      DATE(end_time) as close_date,
      COUNT(id) as sessions_count,
      SUM(initial_cash) as total_initial,
      SUM(closing_cash) as total_closing,
      (SELECT SUM(total) FROM sales WHERE session_id IN (SELECT id FROM cash_sessions WHERE DATE(end_time) = DATE(cs.end_time) AND status = 'ARCHIVED')) as sales_total
    FROM cash_sessions cs
    WHERE status = 'ARCHIVED'
    GROUP BY DATE(end_time)
    ORDER BY close_date DESC
  `).all();
}


// 1. Listado para la tabla
export function getArchivedHistory() {
  return db.prepare(`
        SELECT 
            DATE(end_time) as date,
            COUNT(id) as session_count,
            SUM(closing_cash) as total_cash
        FROM cash_sessions
        WHERE status = 'ARCHIVED'
        GROUP BY DATE(end_time)
        ORDER BY date DESC
    `).all();
}

// 2. Detalle para re-imprimir un reporte Z pasado
export function getPastZReport(date) {
  const sessions = db.prepare(`
        SELECT id, user_name, initial_cash, closing_cash
        FROM cash_sessions
        WHERE DATE(end_time) = ? AND status = 'ARCHIVED'
    `).all(date);

  const sessionIds = sessions.map(s => s.id).join(',');
  const sales = db.prepare(`
        SELECT IFNULL(SUM(total), 0) as total_sales, COUNT(*) as count 
        FROM sales 
        WHERE session_id IN (${sessionIds})
    `).get();

  return {
    date,
    sessions,
    total_sales: sales.total_sales,
    sales_count: sales.count
  };
}

export function closeDayAndSession({ session_id, closing_cash }) {
  const transaction = db.transaction(() => {
    // 1. Primero cerramos la sesión actual del empleado (Cierre X automático)
    const stmtClose = db.prepare(`
      UPDATE cash_sessions 
      SET end_time = CURRENT_TIMESTAMP, 
          closing_cash = ?, 
          status = 'CLOSED' 
      WHERE id = ? AND status = 'OPEN'
    `);
    stmtClose.run(closing_cash, session_id);

    // 2. Obtenemos los datos para el Reporte Z (incluyendo la que acabamos de cerrar)
    const sessions = db.prepare(`
      SELECT id, user_name, initial_cash, closing_cash 
      FROM cash_sessions 
      WHERE status = 'CLOSED'
    `).all();

    const sessionIds = sessions.map(s => s.id).join(',');
    const summary = db.prepare(`
      SELECT SUM(total) as total_sales, COUNT(*) as count 
      FROM sales 
      WHERE session_id IN (${sessionIds})
    `).get();

    return {
      sessions,
      total_sales: summary.total_sales || 0,
      sales_count: summary.count || 0,
      date: new Date().toISOString()
    };
  });

  return transaction();
}


export function getExpectedCash(sessionId) {
  try {
    // 1. Obtenemos el fondo inicial
    const session = db.prepare('SELECT initial_cash FROM cash_sessions WHERE id = ?').get(sessionId);

    // 2. Sumamos las ventas de esa sesión
    const sales = db.prepare('SELECT SUM(total) as total_sales FROM sales WHERE session_id = ?').get(sessionId);

    const initial = session?.initial_cash || 0;
    const totalSales = sales?.total_sales || 0;

    return initial + totalSales;
  } catch (error) {
    console.error("Error al calcular efectivo esperado:", error);
    return 0;
  }
}
export function getSalesTotalsByMethod(sessionId) {
  return db.prepare(`
    SELECT payment_method, SUM(total) as total 
    FROM sales 
    WHERE session_id = ? 
    GROUP BY payment_method
  `).all(sessionId);
}
