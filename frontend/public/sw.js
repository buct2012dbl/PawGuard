// Minimal service worker to prevent 404 errors
// This file serves as a placeholder for service worker functionality

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
});

self.addEventListener('fetch', (event) => {
  // Passthrough - let the browser handle all requests
  console.log('Service Worker fetch:', event.request.url);
});
