import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const resolvePackageVersion = () => {
  if (process.env.npm_package_version) {
    return process.env.npm_package_version
  }

  try {
    const pkgJson = readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
    const pkg = JSON.parse(pkgJson) as { version?: string }
    if (pkg?.version) {
      return pkg.version
    }
  } catch {
    // ignore
  }

  return '0.0.0'
}

const APP_VERSION = resolvePackageVersion()

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
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
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
