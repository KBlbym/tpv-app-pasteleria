import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';
import { initDB, getProducts, saveSale, getDailySales, addProduct, getCategories, getProductsWithCategory ,
   getSettings, updateSettings, updateProductPrice, getActiveProductsWithCategory, toggleProductStatus,
   getAllSales, getSaleItems, getTopProducts, getSalesByHour, getSalesByRange, getDailySalesChart
  } from './services/database.js';
import { printTicket } from './services/printer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "TPV Pastelería - Fase 1",
    webPreferences: {
      // Importante para la comunicación segura
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
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
ipcMain.handle('db:update-product-price', async (event, { name, price }) => {
  return updateProductPrice(name, price);
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