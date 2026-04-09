import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import './index.css'
import App from './App.jsx'

posthog.init('phc_ymHXC8Q7wirEnDPba3k68eoLuipzCGYn6Q8UizA4uLFz', {
  api_host: 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  // autocapture is off — invoice forms contain sensitive client/financial data
  // that should never be sent to a third-party analytics service.
  autocapture: false,
  disable_session_recording: true,
  // mask_all_text as an extra safety net in case autocapture is ever re-enabled
  mask_all_text: true,
  mask_all_element_attributes: true,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
