import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';
import { initDB, getProducts , saveSale, getDailySales, addProduct} from './services/database.js';
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

// 2. Guardar venta e imprimir
ipcMain.handle('db:save-sale', async (event, saleData) => {
  try {
    const saleId = saveSale(saleData.cart, saleData.total);
    
    // Lanzamos la impresión (no bloqueante)
    printTicket({ ...saleData, saleId });

    return { success: true, saleId };
  } catch (error) {
    console.error("Error al vender:", error);
    return { success: false, error: error.message };
  }
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