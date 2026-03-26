const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Aquí expondremos las funciones que React podrá usar
  // --- FUNCIONES DE BASE DE DATOS ---
  // 1. Obtener lista de productos
  getProducts: () => ipcRenderer.invoke('db:get-products'),

  //Obtener lista de productos activos
  getActiveProductsWithCategory: () => ipcRenderer.invoke('db:get-active-products'),


  uploadImage: (path) => ipcRenderer.invoke('upload-image', path),
  // necesitaremos una forma de convertir el nombre en una ruta real para el <img>
  getImagePath: (fileName) => `safe-protocol:///${path.join(IMAGES_DIR, fileName)}`,

  // 3. Guardar una venta
  saveSale: (sale) => ipcRenderer.invoke('db:save-sale', sale),

  // 4. Imprimir ticket
  printTicket: (data) => ipcRenderer.send('print:ticket', data),

  // 5. Test de impresora
  printTest: () => ipcRenderer.invoke('print:test'),


  // --- FUNCIONES DE ADMINISTRACIÓN (FASE 2) ---

  // 1. Añadir nuevo producto
  addProduct: (p) => ipcRenderer.invoke('db:add-product', p),
  // 2. Activar/Desactivar producto
  toggleProduct: (data) => ipcRenderer.invoke('db:toggle-product', data),

  // 2. Actualizar el precio de un producto
  updateProduct: (data) => ipcRenderer.invoke('db:update-product', data),

  // 3. Obtener total de ventas de hoy
  getDailySales: () => ipcRenderer.invoke('db:get-daily-sales'),

  // Categorías
  // Nuevas funciones para categorías y productos con categoría
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  
  addCategory: (category) => ipcRenderer.invoke('db:add-category', category),
  updateCategory: (category) => ipcRenderer.invoke('db:update-category', category),
  deleteCategory: (id) => ipcRenderer.invoke('db:delete-category', id),
  getActiveCategories: () => ipcRenderer.invoke('db:get-active-categories'),

  // Obtener productos con el nombre de su categoría
  getProductsWithCategory: () => ipcRenderer.invoke('db:get-products-with-category'),


  //======================================================//
  //####### FUNCIONES DE CONFIGURACIÓN (FASE 3) #########//
  //======================================================//
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('db:update-settings', settings),


  //======================================//
  //####### Historial de ventas #########//
  //======================================//
  getAllSales: () => ipcRenderer.invoke('db:get-all-sales'),
  getSaleItems: (saleId) => ipcRenderer.invoke('db:get-sale-items', saleId),

  getStats: (limit) => ipcRenderer.invoke('db:get-stats', limit),
  getSalesRange: (range) => ipcRenderer.invoke('db:get-sales-range', range),
  getDailySalesChart: (range) => ipcRenderer.invoke('db:get-chart-data', range),
});

