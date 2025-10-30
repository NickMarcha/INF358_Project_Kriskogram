import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // GitHub Pages configuration - must match repository name
  base: process.env.NODE_ENV === 'production' ? '/INF358_Project_Kriskogram/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // Ensure service worker is copied to output
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  // Public directory files are copied to dist root
  publicDir: 'public',
})
