import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src/renderer'), // Establece la raíz en renderer
  base: './', // Asegura que las rutas de los archivos sean relativas
  build: {
    outDir: '../../dist', // La build saldrá a la raíz del proyecto
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})