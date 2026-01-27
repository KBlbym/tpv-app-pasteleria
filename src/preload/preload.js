const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Aquí expondremos las funciones que React podrá usar
  getProducts: () => ipcRenderer.invoke('db:get-products'),
  saveSale: (sale) => ipcRenderer.invoke('db:save-sale', sale),
  printTicket: (data) => ipcRenderer.send('print:ticket', data),
  printTest: () => ipcRenderer.invoke('print:test'),
  // --- FUNCIONES DE ADMINISTRACIÓN (FASE 2) ---
  addProduct: (p) => ipcRenderer.invoke('db:add-product', p),
  getDailySales: () => ipcRenderer.invoke('db:get-daily-sales')
});