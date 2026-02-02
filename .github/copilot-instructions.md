# Copilot Instructions for tpv-pasteleria

## Project Overview
**tpv-pasteleria** is a desktop POS (Point of Sale) system for bakeries built with Electron, React, Vite, and SQLite. It displays products, manages shopping carts, records sales with persistent database storage, and supports printing receipts.

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS (via Vite)
- **Desktop Framework**: Electron 40.x with IPC communication
- **Database**: SQLite via better-sqlite3
- **Build**: Vite for HMR development, Tailwind 4.x for styling
- **Lint**: ESLint with React Hooks and Refresh plugins

## Architecture
- **Electron Main Process** (`src/main/main.js`) - Manages window creation, IPC handlers, database initialization
- **React App** (`src/App.jsx`) - Renders product grid + shopping cart UI, communicates via `window.electronAPI`
- **Preload Script** (`src/preload/preload.js`) - Exposes safe IPC methods (`getProducts`, `saveSale`) to React
- **Database Layer** (`src/main/database.js`) - SQLite operations (products, sales, sale_items tables)

Critical decisions: Context Isolation enabled with nodeIntegration disabled for security; all React-to-Main communication via preload's contextBridge using `ipcRenderer.invoke()` (promise-based RPC).

## Development Workflow
Commands:
- `npm run dev` - Start Vite dev server + Electron with auto-reload
- `npm run build` - Build React bundle via Vite
- `npm run electron` - Launch Electron without dev server (requires prior build)
- `npm run lint` - ESLint validation
- `npm run preview` - Preview built app

Dev mode loads React from `http://localhost:5173` (Vite HMR); DevTools open automatically; Database persists in `%APPDATA%/Pastelería/pasteleria.db`.

## Project-Specific Patterns
IPC Communication: Never expose raw `ipcRenderer` to React—use preload as intermediary.
```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  getProducts: () => ipcRenderer.invoke('db:get-products'),
  saveSale: (sale) => ipcRenderer.invoke('db:save-sale', sale),
});

// React
window.electronAPI?.getProducts().then(setProducts);
```

State Management: Simple hooks with `useState` for `products`, `cart`. Cart items: `{id, name, price, qty}`; adding duplicates increments `qty`.

Database: All monetary values `REAL` (floats); display via `.toFixed(2)` for Euro formatting. Transactions for multi-table writes.

Styling: Tailwind CSS v4.x; Colors: Primary orange (`border-orange-500`), accents green (`bg-green-600`); Responsive grid (`grid-cols-3`); Interactive (`active:scale-95`).

## Database Schema
- `products`: `id`, `name`, `price`, `category_id`
- `sales`: `id`, `total`, `date`
- `sale_items`: `id`, `sale_id`, `product_id`, `qty`, `price`

## Key Files Reference
- [src/App.jsx](src/App.jsx) - Main UI with view switching (Sales/Admin)
- [src/main/main.js](src/main/main.js) - Electron main & IPC handlers
- [src/main/database.js](src/main/database.js) - SQLite init & queries
- [src/preload/preload.js](src/preload/preload.js) - Security boundary for IPC
- [vite.config.js](vite.config.js) - Build config (root in renderer, outDir dist)

## Common Tasks
Adding a feature: Add DB functions in `database.js`, IPC handler in `main.js`, expose in `preload.js`, call in React. Use prepared statements for security: `db.prepare(sql).run(params)`. Transactions for multi-table ops.
