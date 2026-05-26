// app/hooks/useLiff.js
// Hook สำหรับดึง Line userId — ใช้ใน SmartWorklogWorkspace และ component อื่นๆ
'use client'
import { useState, useEffect } from 'react'

export function useLiff() {
  const [userId, setUserId]       = useState('')
  const [displayName, setName]    = useState('')
  const [pictureUrl, setPicture]  = useState('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const id   = localStorage.getItem('line_user_id') || ''
    const name = localStorage.getItem('line_display_name') || ''
    const pic  = localStorage.getItem('line_picture_url') || ''
    setUserId(id)
    setName(name)
    setPicture(pic)
    setConnected(!!id)
  }, [])

  function disconnect() {
    localStorage.removeItem('line_user_id')
    localStorage.removeItem('line_display_name')
    localStorage.removeItem('line_picture_url')
    setUserId(''); setName(''); setPicture(''); setConnected(false)
  }

  const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID || ''}`

  return { userId, displayName, pictureUrl, connected, liffUrl, disconnect }
}
