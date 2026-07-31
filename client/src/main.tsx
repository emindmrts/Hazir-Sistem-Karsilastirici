import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { initPerformanceMonitoring } from './utils/performance-monitor'
import './index.css'
import App from './App.tsx'

// Performance monitoring başlat
if (import.meta.env.PROD) {
  initPerformanceMonitoring()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
