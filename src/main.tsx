import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Global styles first, so component stylesheets layer on top of the base.
import './styles/app.css'
import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
