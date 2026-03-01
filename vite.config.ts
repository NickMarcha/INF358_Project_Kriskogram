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
const BASE = process.env.NODE_ENV === 'production' ? '/INF358_Project_Kriskogram/' : '/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    // Fix favicon paths for production: relative paths break on client-side routes
    {
      name: 'fix-favicon-paths',
      transformIndexHtml(html) {
        if (BASE !== '/') {
          const base = BASE.replace(/\/$/, '') // remove trailing slash for path join
          const v = APP_VERSION // cache-bust so browsers fetch new favicon instead of cached React logo
          return html
            .replace(/href="\.\/favicon\.ico[^"]*"/, `href="${base}/favicon.ico?v=${v}"`)
            .replace(/href="\.\/logo192\.png[^"]*"/, `href="${base}/logo192.png?v=${v}"`)
            .replace('href="./manifest.json"', `href="${base}/manifest.json"`)
        }
        return html
      },
    },
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
  base: BASE,
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
