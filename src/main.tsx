import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

// Service Worker: enable only in production to avoid dev cache/HMR conflicts
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const baseUrl = import.meta.env.BASE_URL || '/'
      const swUrl = `${baseUrl}sw.js`
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[Service Worker] Registered successfully:', registration.scope)
          setInterval(() => registration.update(), 3600000)
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed:', error)
        })
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    })
  } else {
    // Dev: actively unregister any existing service workers to prevent stale caches & invalid hook errors
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister())
    }).catch(() => {})
  }
}

// Handle 404 redirect from GitHub Pages
(function() {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    // Extract the path after the base URL
    const baseUrl = location.origin + import.meta.env.BASE_URL;
    if (redirect.startsWith(baseUrl)) {
      const path = redirect.substring(baseUrl.length - 1); // Keep leading slash
      history.replaceState(null, '', import.meta.env.BASE_URL.replace(/\/$/, '') + path);
    }
  }
})();

// Create a new router instance with basepath for GitHub Pages
const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ''), // Remove trailing slash from BASE_URL
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
