import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import EarningsPositionChecker from './components/earnings.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EarningsPositionChecker />
  </StrictMode>,
)
