import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerCollectaServiceWorker } from './pwa.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void registerCollectaServiceWorker({
  mode: import.meta.env.MODE,
  serviceWorker: navigator.serviceWorker,
});
