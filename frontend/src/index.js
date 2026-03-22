import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Suppress cross-origin "Script error" from external monitoring scripts
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || event.message?.includes('Script error')) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'NotAllowedError' || event.reason?.message?.includes('play()')) {
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register PWA service worker in production.
// Avoid clearing caches on every load; that breaks offline/performance.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available; refresh to apply latest assets.
            window.location.reload();
          }
        });
      });
    } catch (e) {
      console.log('SW setup:', e.message);
    }
  });
}
