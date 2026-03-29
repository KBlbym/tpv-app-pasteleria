import { app, protocol, ipcMain, net, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';
import {
  initDB, getProducts, saveSale, getDailySales, addProduct, getCategories, getProductsWithCategory,
  getSettings, updateSettings, updateProduct, getActiveProductsWithCategory, toggleProductStatus,
  getAllSales, getSaleItems, getTopProducts, getSalesByHour, getSalesByRange, getDailySalesChart, 
  addCategory,
  updateCategory, 
  deleteCategory, 
  getActiveCategories,
  getActiveSession,
  openSession,
  closeSession

} from './services/database.js';
import { printTicket } from './services/printer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Definir la carpeta donde se guardarán las fotos (en la carpeta de datos del usuario)
const IMAGES_DIR = path.join(app.getPath('userData'), 'product_images');

// Registrar que el protocolo es "seguro" (privilegios)
protocol.registerSchemesAsPrivileged([
  { scheme: 'safe-protocol', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// Crear la carpeta si no existe
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "TPV Pastelería - Gestión de Ventas",
    webPreferences: {
      // Importante para la comunicación segura
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Si estamos en desarrollo, carga el servidor de Vite
  // Si estamos en producción, carga el index.html de la build
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Abre las herramientas de dev automáticamente
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}


// Inicialización de la App
app.whenReady().then(() => {
// Implementar el manejador del protocolo
protocol.handle('safe-protocol', (request) => {
  try {
    // request.url será algo como "safe-protocol://1770163582587-coca-cola.png"
    const url = new URL(request.url);

    // El nombre del archivo es el "host" o el "pathname" dependiendo de cómo se escriba
    // Con safe-protocol://archivo.png, el archivo es url.host
    const fileName = url.host;

    const fullPath = path.join(IMAGES_DIR, fileName);

    // Verificamos si el archivo existe antes de intentar leerlo
    if (!fs.existsSync(fullPath)) {
      console.error("Archivo no encontrado en el disco:", fullPath);
      return new Response("Not Found", { status: 404 });
    }

    return net.fetch(`file://${fullPath}`);
  } catch (error) {
    console.error("Error en el protocolo safe-protocol:", error);
    return new Response("Error", { status: 500 });
  }
});
  initDB(); // Arrancamos SQLite y creamos tablas si no existen
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- MANEJADORES IPC (El Backend comunicándose con React) ---

// 1. Obtener lista de productos
ipcMain.handle('db:get-products', async () => {
  return getProducts();
});

//Obtener lista de productos activos
ipcMain.handle('db:get-active-products', async () => {
  return getActiveProductsWithCategory();
});
//#region  manejadores de categorías
// Añadir nueva categoría
ipcMain.handle('db:add-category', async (event, category) => {
  return addCategory(category);
});
// Manejador para actualizar categoría
ipcMain.handle('db:update-category', async (event, category) => {
  return updateCategory(category);
});

// Manejador para borrar categoría (con validación de productos huérfanos)
ipcMain.handle('db:delete-category', async (event, id) => {
  try {
    return deleteCategory(id);
  } catch (error) {
    // El error lanzado en database.js llega aquí y se envía al frontend
    throw new Error(error.message); 
  }
});

// Manejador para obtener solo categorías con productos (para la vista de Ventas)
ipcMain.handle('db:get-active-categories', async () => {
  return getActiveCategories();
});
//#endregion
// 2. Guardar venta e imprimir
// src/main/main.js
ipcMain.handle('db:save-sale', async (event, saleData) => {
  let savedId = null;

  try {
    // 1. Guardar en DB (Esto ya funciona por lo que veo en tus logs)
    const result = await saveSale(saleData);
    savedId = result.id;
    console.log("Venta guardada con ID:", savedId);
  } catch (dbError) {
    console.error("Error en DB:", dbError);
    return { success: false, error: "Error al guardar en base de datos" };
  }

  // 2. Intento de impresión (Si falla, no pasa nada, seguimos adelante)
  try {
    await printTicket(saleData);
  } catch (printError) {
    console.log("Impresora no detectada (Modo simulación)");
  }

  // 3. RETORNO FINAL: Siempre devolvemos éxito si la DB funcionó
  return { success: true, id: savedId };
});

// 3. Obtener total de ventas de hoy (Fase 2)
ipcMain.handle('db:get-daily-sales', async () => {
  try {
    return getDailySales();
  } catch (error) {
    console.error("Error en estadísticas:", error);
    return 0;
  }
});

// 4. Añadir nuevo producto (Fase 2)
ipcMain.handle('db:add-product', async (event, product) => {
  try {
    return addProduct(product);
  } catch (error) {
    console.error("Error al añadir producto:", error);
    throw error;
  }
});
// Nuevo manejador para actualizar el precio de un producto
ipcMain.handle('db:update-product', async (event, p) => {
  return updateProduct(p);
});

//Cambiar el estado activo/inactivo de un producto
ipcMain.handle('db:toggle-product', async (event, { id, status }) => {
  return toggleProductStatus(id, status);
});

// 5. Test de impresora
ipcMain.handle('print:test', async () => {
  try {
    const mockData = {
      saleId: 'TEST-INIT',
      total: 0,
      cart: [{ qty: 1, name: 'CONCORD CP-450 READY', price: 0 }]
    };
    printTicket(mockData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
// 6. Manejador para obtener categorías (para el selector del formulario)
ipcMain.handle('db:get-categories', async () => {
  try {
    return getCategories();
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return [];
  }
});

// 7. Manejador para obtener productos con el nombre de su categoría (para la tabla)
ipcMain.handle('db:get-products-with-category', async () => {
  try {
    return getProductsWithCategory();
  } catch (error) {
    console.error("Error al obtener productos con categoría:", error);
    return [];
  }
});

// Handler para guardar imágenes
ipcMain.handle('upload-image', async (event, { buffer, fileName }) => {
  try {
    const uniqueName = `${Date.now()}-${fileName}`;
    const destPath = path.join(IMAGES_DIR, uniqueName);

    // Convertimos el ArrayBuffer que viene de React en un Buffer de Node.js
    const nodeBuffer = Buffer.from(buffer);

    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    // Guardamos el archivo directamente
    fs.writeFileSync(destPath, nodeBuffer);

    return uniqueName;
  } catch (error) {
    console.error("Error al guardar imagen desde buffer:", error);
    return null;
  }
});

// 8. Manejador para obtener la configuración
ipcMain.handle('db:get-settings', async () => {
  return getSettings();
});
// 9. Manejador para actualizar la configuración
ipcMain.handle('db:update-settings', async (event, settings) => {
  try {
    return updateSettings(settings);
  } catch (error) {
    console.error("Error al actualizar settings:", error);
    return { success: false, error };
  }
});

//======================================//
//####### Historial de ventas #########//
//======================================//

// Obtener todas las ventas
ipcMain.handle('db:get-all-sales', async () => getAllSales());

// Obtener los items de una venta específica
ipcMain.handle('db:get-sale-items', async (event, saleId) => {
  try {
    console.log("Buscando items para la venta ID:", saleId); // Para debugear
    if (!saleId) throw new Error("ID de venta no proporcionado");
    return getSaleItems(saleId);
  } catch (error) {
    console.error("Error en get-sale-items:", error);
    throw error;
  }
});

//Obtener estadísticas
ipcMain.handle('db:get-stats', async (event, limit) => {
  const hourlyData = getSalesByHour(); // Obtenemos el array de 24 horas
  // Buscamos la hora con más tickets para la tarjeta principal
  const busyHour = [...hourlyData].sort((a, b) => b.count - a.count)[0];
  return {
    topProducts: getTopProducts(limit),
    busyHour: busyHour,
    hourlyData: hourlyData // ESTO ES LO QUE LEE EL GRÁFICO
  };
});

// Obtener ventas en un rango de fechas
ipcMain.handle('db:get-sales-range', async (event, { start, end }) => {
  return getSalesByRange(start, end);
});

ipcMain.handle('db:get-chart-data', async (event, { start, end }) => {
  return getDailySalesChart(start, end);
});

//======================================//
//####### Z-Report #########//
//======================================//
//#region (Fase 4) implimentación Z-Report con manejo de sesiones

// Validar si hay una sesión abierta antes de abrir una nueva
ipcMain.handle('db:get-active-session', async () => {
  return getActiveSession();
});

ipcMain.handle('db:open-session', async (event, data) => {
  return openSession(data);
});

ipcMain.handle('db:close-session', async (event, data) => {
  const result = await closeSession(data); 
  return result;
});

//#endregion
