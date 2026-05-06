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
  db.exec(`
    CREATE TABLE IF NOT EXISTS cash_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
    )
`);
  // Mantenimiento de columnas para DBs ya existentes
  try {
    db.prepare("ALTER TABLE products ADD COLUMN image_path TEXT").run();
    db.prepare("ALTER TABLE categories ADD COLUMN image_path TEXT").run();
    db.prepare("ALTER TABLE sales ADD COLUMN session_id INTEGER").run();
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
    db.prepare(`UPDATE sales SET payment_method = 'CASH' WHERE payment_method IS NULL`).run();
    console.log("Columna payment_method actualizada con éxito.");
  } catch (err) {
    if (err.message.includes("duplicate column payment_method")) {
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


export function saveSale({ cart, total, session_id, payment_method }) {
  const transaction = db.transaction((cartItems, totalAmount, sessionId, method) => {
    // Insertamos la venta incluyendo el método de pago
    const stmt = db.prepare('INSERT INTO sales (total, session_id, payment_method) VALUES (?, ?, ?)').run(totalAmount, sessionId, method);
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

  const id = transaction(cart, total, session_id, payment_method);
  return { id, success: true };
}

// --- PRODUCTOS ---
export function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}

export function getDailySales() {
  const row = db.prepare(`
    SELECT 
      SUM(s.total) as dailyTotal,
      SUM(CASE WHEN s.payment_method = 'CASH' THEN s.total ELSE 0 END) as totalCash,
      SUM(CASE WHEN s.payment_method = 'CARD' THEN s.total ELSE 0 END) as totalCard
    FROM sales s 
    JOIN cash_sessions cs ON s.session_id = cs.id  
    WHERE cs.status != 'ARCHIVED'
  `).get();

  return {
    dailyTotal: row.dailyTotal || 0,
    totalCash: row.totalCash || 0,
    totalCard: row.totalCard || 0
  };
}

// Gastos totales de todas las sesiones de la jornada actual (que no han sido enviadas al histórico Z)
export function getDailyExpenses() {
  // Sumamos todos los gastos de sesiones que NO están archivadas
  // Esto nos da el total de "hoy" (el acumulado para el próximo Reporte Z)
  const row = db.prepare(`
    SELECT IFNULL(SUM(e.amount), 0) as total 
    FROM cash_expenses e
    JOIN cash_sessions s ON e.session_id = s.id
    WHERE s.status != 'ARCHIVED'
  `).get();

  return row.total || 0;
}

// Gastos solo de la sesión que está abierta ahora mismo
export function getActiveSessionExpenses() {
  const row = db.prepare(`
    SELECT IFNULL(SUM(e.amount), 0) as total 
    FROM cash_expenses e
    JOIN cash_sessions s ON e.session_id = s.id
    WHERE s.status = 'OPEN'
  `).get();

  return row.total || 0;
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
  try {
    return db.prepare(`
      SELECT strftime('%H', date) as hour, COUNT(id) as count, SUM(total) as total_amount
      FROM sales
      GROUP BY hour
      ORDER BY hour ASC 
    `).all(); // Ordenado por hora para el gráfico
  } catch (error) {
    console.error("Error en getSalesByHour:", error);
    return [];
  }
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
  try {
    const row = db.prepare(`
      SELECT date(date) as day, SUM(total) as daily_total 
      FROM sales 
      WHERE date >= ? AND date <= ? 
      GROUP BY day 
      ORDER BY day ASC
    `).all(startDate, endDate);

    return row || []; // Siempre retorna un array aunque esté vacío
  } catch (error) {
    console.error("Error en getDailySalesChart:", error);
    return [];
  }
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
  // 1. Obtenemos las sesiones cerradas pero calculando el neto desde la tabla 'sales'
  const sessions = db.prepare(`
    SELECT 
      cs.id, 
      cs.user_name, 
      cs.initial_cash, 
      cs.closing_cash,
      (SELECT COALESCE(SUM(total), 0) FROM sales WHERE session_id = cs.id) as net_cash
    FROM cash_sessions cs
    WHERE cs.status = 'CLOSED'
  `).all();

  if (sessions.length === 0) {
    return { sessions: [], expenses: [], total_sales: 0, sales_count: 0, total_expenses: 0, totals_by_method: { CASH: 0, CARD: 0 } };
  }

  const sessionIds = sessions.map(s => s.id).join(',');

  // 2. Resumen total de la jornada
  const salesSummary = db.prepare(`
    SELECT SUM(total) as total_sales, COUNT(*) as count 
    FROM sales 
    WHERE session_id IN (${sessionIds})
  `).get();

  // 3. Gastos detallados
  const expenses = db.prepare(`
    SELECT amount, description 
    FROM cash_expenses 
    WHERE session_id IN (${sessionIds})
  `).all() || [];

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // 4. Totales por método
  const methods = getPaymentMethods(sessionIds);
  const totalsByMethod = getTotalsByMethod(methods) || { CASH: 0, CARD: 0 };

  return {
    sessions,
    expenses,
    total_sales: salesSummary.total_sales || 0,
    sales_count: salesSummary.count || 0,
    total_expenses: totalExpenses,
    date: new Date().toISOString(),
    totals_by_method: {
        CASH: totalsByMethod.CASH || 0,
        CARD: totalsByMethod.CARD || 0
    }
  };
}

export function getXReportData(sessionId) {
  // 1. Obtenemos los datos básicos de la sesión
  const session = db.prepare(`
    SELECT id, user_name, start_time, end_time, initial_cash, closing_cash 
    FROM cash_sessions 
    WHERE id = ?
  `).get(sessionId);

  // 2. Totales generales de ventas
  const sales = db.prepare(`
    SELECT IFNULL(SUM(total), 0) as total_sales, COUNT(*) as count 
    FROM sales 
    WHERE session_id = ?
  `).get(sessionId);

  // 3. Métodos de pago (para el desglose CARD/CASH)
  const methods = getPaymentMethods(sessionId);
  const totalsByMethod = getTotalsByMethod(methods);

  // 4. NUEVO: Obtenemos los gastos de esta sesión
  const expensesList = db.prepare(`
    SELECT amount, description, created_at 
    FROM cash_expenses 
    WHERE session_id = ?
  `).all(sessionId);

  const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

  // 5. CÁLCULO DEL ESPERADO:
  // Solo sumamos las ventas en efectivo (CASH) y restamos los gastos.
  const cashSales = totalsByMethod['CASH'] || 0;
  const expected = session.initial_cash + cashSales - totalExpenses;

  return {
    ...session,
    total_sales: sales.total_sales,
    sales_count: sales.count,
    totals_by_method: totalsByMethod,
    // Nuevos campos para el ticket:
    expenses: expensesList,
    total_expenses: totalExpenses,
    expected_cash: expected
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
  const history = db.prepare(`
        SELECT 
            s.date,
            COUNT(s.id) as session_count,
            (SUM(s.closing_cash - s.initial_cash) - IFNULL(e.total_expenses, 0)) as total_cash
        FROM (SELECT id, DATE(end_time) as date, closing_cash, initial_cash FROM cash_sessions WHERE status = 'ARCHIVED') s
        LEFT JOIN (
            SELECT session_id, SUM(amount) as total_expenses 
            FROM cash_expenses GROUP BY session_id
        ) e ON s.id = e.session_id
        GROUP BY s.date
        ORDER BY s.date DESC
    `).all();
  return history;
}

// 2. Detalle para re-imprimir un reporte Z pasado
export function getPastZReport(date) {
  const sessions = db.prepare(`
        SELECT id, user_name, initial_cash, closing_cash
        FROM cash_sessions
        WHERE DATE(end_time) = ? AND status = 'ARCHIVED'
    `).all(date);

  const sessionIds = sessions.map(s => s.id).join(',');
  // 1. Total general
  const sales = db.prepare(`
        SELECT IFNULL(SUM(total), 0) as total_sales, COUNT(*) as count 
        FROM sales 
        WHERE session_id IN (${sessionIds})
    `).get();

  // 2. DESGLOSE POR MÉTODO (Nuevo)
  const methods = getPaymentMethods(sessionIds);
  // Convertimos el array de métodos en un objeto fácil de usar: { CASH: 100, CARD: 50 }
  const totalsByMethod = getTotalsByMethod(methods);

  return {
    date,
    sessions,
    total_sales: sales.total_sales,
    sales_count: sales.count,
    totals_by_method: totalsByMethod
  };
}

export function closeDayAndSession({ session_id, closing_cash }) {
  const transaction = db.transaction(() => {
    // 1. Cerramos la sesión actual del empleado que solicita el cierre Z
    // Esto asegura que su turno también cuente en el reporte final
    const stmtClose = db.prepare(`
      UPDATE cash_sessions 
      SET end_time = CURRENT_TIMESTAMP, 
          closing_cash = ?, 
          status = 'CLOSED' 
      WHERE id = ? AND status = 'OPEN'
    `);
    stmtClose.run(closing_cash, session_id);

    // 2. Obtenemos todas las sesiones cerradas para el Reporte Z
    // Usamos una subconsulta para calcular 'net_cash' sumando los tickets reales de cada sesión
    const sessions = db.prepare(`
      SELECT 
        id, 
        user_name, 
        initial_cash, 
        closing_cash,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE session_id = cash_sessions.id) as net_cash
      FROM cash_sessions 
      WHERE status = 'CLOSED'
    `).all();

    // Si por alguna razón no hay sesiones (caso borde), devolvemos estructura vacía
    if (sessions.length === 0) {
      return { 
        sessions: [], 
        expenses: [],
        total_sales: 0, 
        sales_count: 0, 
        total_expenses: 0,
        date: new Date().toISOString(), 
        totals_by_method: { CASH: 0, CARD: 0 } 
      };
    }

    // Listado de IDs para las consultas de agregación
    const sessionIds = sessions.map(s => s.id).join(',');

    // 3. Resumen global de ventas de toda la jornada
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as total_sales, 
        COUNT(*) as count 
      FROM sales 
      WHERE session_id IN (${sessionIds})
    `).get();

    // 4. Obtenemos todos los gastos realizados en estas sesiones
    const expenses = db.prepare(`
      SELECT amount, description 
      FROM cash_expenses 
      WHERE session_id IN (${sessionIds})
    `).all() || [];

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // 5. Desglose por métodos de pago (Efectivo/Tarjeta)
    // Asumiendo que tienes las funciones auxiliares getPaymentMethods y getTotalsByMethod
    const methods = getPaymentMethods(sessionIds);
    const totalsByMethod = getTotalsByMethod(methods) || { CASH: 0, CARD: 0 };

    // 6. Retornamos el objeto completo para el frontend
    return {
      sessions, // Cada sesión ahora tiene su 'net_cash' real
      expenses,
      total_sales: summary.total_sales,
      sales_count: summary.count,
      total_expenses: totalExpenses,
      date: new Date().toISOString(),
      totals_by_method: {
        CASH: totalsByMethod.CASH || 0,
        CARD: totalsByMethod.CARD || 0
      }
    };
  });

  // Ejecutamos la transacción
  return transaction();
}

export function getExpectedCash(sessionId) {
  const session = db.prepare('SELECT initial_cash FROM cash_sessions WHERE id = ?').get(sessionId);

  const sales = db.prepare(`
        SELECT IFNULL(SUM(total), 0) as total 
        FROM sales 
        WHERE session_id = ? AND payment_method = 'CASH'
    `).get(sessionId);

  const expenses = db.prepare(`
        SELECT IFNULL(SUM(amount), 0) as total 
        FROM cash_expenses 
        WHERE session_id = ?
    `).get(sessionId);

  return session.initial_cash + sales.total - expenses.total;
}

export function getSalesTotalsByMethod(sessionId) {
  return db.prepare(`
    SELECT payment_method, SUM(total) as total 
    FROM sales 
    WHERE session_id = ? 
    GROUP BY payment_method
  `).all(sessionId);
}

//HELPER para obtener el metodo de pago. Esto se puede usar para mostrar el desglose en el Reporte X o Z
export function getPaymentMethods(sessionIds) {
  const methods = db.prepare(`
        SELECT payment_method, IFNULL(SUM(total), 0) as total
        FROM sales
        WHERE session_id IN (${sessionIds})
        GROUP BY payment_method
    `).all();
  return methods;
}
//obtener el total por método de pago para una sesión específica
export function getTotalsByMethod(methods) {

  const totalsByMethod = {
    CASH: methods.find(m => m.payment_method === 'CASH')?.total || 0,
    CARD: methods.find(m => m.payment_method === 'CARD')?.total || 0
  };
  return totalsByMethod;
}

// Función para registrar un gasto
export function addExpense(sessionId, amount, description) {
  // Validamos que la sesión exista y esté abierta
  const session = db.prepare("SELECT status FROM cash_sessions WHERE id = ?").get(sessionId);
  if (!session || session.status !== 'OPEN') {
    throw new Error("No se puede registrar un gasto en una sesión cerrada o inexistente");
  }

  return db.prepare(`
        INSERT INTO cash_expenses (session_id, amount, description)
        VALUES (?, ?, ?)
    `).run(sessionId, amount, description);
}