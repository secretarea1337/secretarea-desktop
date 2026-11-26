import { createRoot } from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App.tsx';
import './index.css';

if (
  'serviceWorker' in navigator &&
  (window.location.protocol === 'http:' || window.location.protocol === 'https:')
) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // ignore registration errors
      });
    });
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      window.caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('secretarea-offline-'))
              .map((k) => window.caches.delete(k))
          )
        )
        .catch(() => {});
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <IconContext.Provider value={{ weight: 'duotone' }}>
    <App />
  </IconContext.Provider>
);
