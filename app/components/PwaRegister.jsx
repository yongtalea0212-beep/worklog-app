'use client'
import { useEffect } from 'react'

// Registers the service worker once the page has loaded. No UI.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}
