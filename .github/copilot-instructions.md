# Copilot Instructions for tpv-pasteleria

## Project Overview
**tpv-pasteleria** is a desktop POS (Point of Sale) system for bakeries built with Electron, React, Vite, and SQLite. The app displays products, manages shopping carts, and records sales with persistent database storage.

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS (via Vite)
- **Desktop Framework**: Electron 40.x with IPC communication
- **Database**: SQLite via better-sqlite3
- **Build**: Vite for HMR development, Tailwind 4.x for styling
- **Lint**: ESLint with React Hooks and Refresh plugins

### Key Component Flow
1. **Electron Main Process** (`src/main/main.js`) - Manages window creation, IPC handlers, and database initialization
2. **React App** (`src/App.jsx`) - Renders product grid + shopping cart UI, communicates via `window.electronAPI`
3. **Preload Script** (`src/preload/preload.js`) - Exposes safe IPC methods (`getProducts`, `saveSale`) to React
4. **Database Layer** (`src/main/database.js`) - SQLite operations (products, sales, sale_items tables)

### Critical Architecture Decisions
- **Context Isolation**: Enabled with nodeIntegration disabled for security; all React-to-Main communication flows through preload's contextBridge
- **IPC Pattern**: Renderer → Preload → Main uses `ipcRenderer.invoke()` (promise-based RPC) for bidirectional communication
- **Database Transactions**: `saveSale()` uses transaction wrapping to ensure atomic writes of sales + line items

## Development Workflow

### Commands
```bash
npm run dev          # Start Vite dev server + Electron with auto-reload
npm run build        # Build React bundle via Vite
npm run electron     # Launch Electron without dev server (requires prior build)
npm run lint         # ESLint validation
npm run preview      # Preview built app
```

### Dev Environment Setup
- Dev mode loads React from `http://localhost:5173` (Vite HMR)
- DevTools open automatically during development
- Database persists in `%APPDATA%/Pastelería/pasteleria.db` (user data path)

## Project-Specific Patterns

### IPC Communication Pattern
All Electron IPC in this project uses the **preload + contextBridge** pattern:
```javascript
// preload.js exposes safe methods
contextBridge.exposeInMainWorld('electronAPI', {
  getProducts: () => ipcRenderer.invoke('db:get-products'),
  saveSale: (sale) => ipcRenderer.invoke('db:save-sale', sale),
});

// React calls via window.electronAPI
window.electronAPI?.getProducts().then(setProducts);
```
**Key rule**: Never expose raw `ipcRenderer` to React—use preload as intermediary.

### State Management
React uses simple hooks (no Redux/Zustand) with `useState` for:
- `products`: Product list from DB
- `cart`: Current shopping cart items with quantity

Cart logic: Items are objects with `{id, name, price, qty}`. Adding duplicates increments `qty` rather than creating new entries.

### Database Schema
- **products**: `id`, `name`, `price`, `category`
- **sales**: `id`, `total`, `date` (CURRENT_TIMESTAMP)
- **sale_items**: `id`, `sale_id`, `product_id`, `qty`, `price` (denormalized for record-keeping)

**Convention**: All monetary values are `REAL` (floats); display via `.toFixed(2)` for Euro formatting.

### Styling
- Tailwind CSS v4.x with PostCSS integration
- Colors: Primary orange (`border-orange-500`), accents green (`bg-green-600`)
- Responsive grid: Products use `grid-cols-3` layout
- Interactive feedback: `active:scale-95` for button press feel

## Key Files Reference
- [src/App.jsx](src/App.jsx) - Main UI component (product grid + cart ticket)
- [src/main/main.js](src/main/main.js) - Electron main process & IPC handlers
- [src/main/database.js](src/main/database.js) - SQLite initialization & queries
- [src/preload/preload.js](src/preload/preload.js) - Security boundary for IPC
- [vite.config.js](vite.config.js) - Build configuration

## Common Tasks

### Adding a New Feature
1. If it needs data: add SQLite functions to `database.js`, export them
2. Add IPC handler in `main.js` via `ipcMain.handle()`
3. Expose in `preload.js` contextBridge
4. Call via `window.electronAPI.methodName()` in React
5. Update UI in `App.jsx`

### Modifying the Database
- Edit table schemas in `initDB()` (database.js)
- Use prepared statements for security: `db.prepare(sql).run(params)`
- Use transactions for multi-table operations

### Testing & Debugging
- Run `npm run lint` to validate code
- DevTools are auto-open in dev mode
- Check `console.log()` output in DevTools for IPC/DB issues
- Database file location: `%APPDATA%/Pastelería/pasteleria.db`
