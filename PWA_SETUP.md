# PWA Setup Documentation

This document outlines the Progressive Web App (PWA) setup for Kriskogram, enabling offline functionality and app installation.

## What Was Implemented

### 1. **Web App Manifest** (`public/manifest.json`)
- Updated with proper app name, description, and icons
- Configured for standalone display mode
- Added theme colors and iOS metadata
- Enables "Add to Home Screen" functionality

### 2. **Service Worker** (`public/sw.js`)
- Caches static assets (HTML, CSS, JS, images, data files)
- Provides offline functionality after initial load
- Handles cache updates and cleanup
- Supports GitHub Pages base path configuration

### 3. **Service Worker Registration** (`src/main.tsx`)
- Automatically registers service worker on app load
- Checks for updates hourly
- Handles service worker updates gracefully

### 4. **HTML Metadata Updates** (`index.html`)
- Added proper meta tags for PWA
- Configured theme color
- Added iOS-specific meta tags for better mobile experience

## Offline Functionality

The app now works offline after the initial load:

1. **Static Assets**: All HTML, CSS, JavaScript, and images are cached
2. **Data Files**: Sample datasets are cached for offline access
3. **User Data**: IndexedDB (used for dataset storage) works offline by default
4. **Navigation**: All routes work offline once cached

### What Requires Internet
- **Initial Load**: First visit requires internet to download assets
- **Data Resets**: Clearing all data via service worker message (if implemented)
- **Updates**: Service worker checks for app updates (but serves cached version if offline)

## Installation

Users can install the app on their devices:

### Desktop (Chrome/Edge)
1. Visit the site
2. Click the install icon in the address bar
3. Or use the browser menu: "Install Kriskogram"

### Mobile (iOS)
1. Visit the site in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Mobile (Android/Chrome)
1. Visit the site
2. A banner will appear: "Install App"
3. Or use the browser menu: "Add to Home Screen"

## Testing

### Local Development
```bash
npm run build
npm run serve
```
- Open DevTools → Application → Service Workers
- Check "Offline" to test offline functionality
- Verify cache storage in DevTools

### Production Testing
1. Build and deploy to GitHub Pages
2. Visit the live site
3. Check browser DevTools for service worker registration
4. Test offline by disconnecting internet after initial load

## Service Worker Cache Strategy

- **Cache First**: Serves from cache when available, fetches from network otherwise
- **Stale-While-Revalidate**: Updates cache in background while serving cached content
- **Navigation Fallback**: Returns `index.html` for navigation requests when offline

## Cache Management

The service worker listens for messages to clear cache:
```javascript
navigator.serviceWorker.controller.postMessage({ type: 'CACHE_CLEAR' })
```

## Build Process

The service worker is automatically copied to `dist/` during build:
- Vite copies files from `public/` to `dist/` root
- Service worker is accessible at `/INF358_Project_Kriskogram/sw.js` in production
- Base path is automatically detected by the service worker

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify `sw.js` is accessible (check Network tab)
- Ensure site is served over HTTPS (required for service workers, except localhost)

### Offline Mode Not Working
- Clear browser cache and reload
- Unregister old service workers (DevTools → Application → Service Workers)
- Check that assets are being cached (DevTools → Application → Cache Storage)

### Installation Prompt Not Appearing
- Verify manifest.json is accessible and valid
- Check that icons are proper size (192x192, 512x512)
- Ensure site meets PWA requirements (HTTPS, manifest, service worker)

