'use client'
// app/components/ErrorBoundary.jsx
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 16,
          background: 'linear-gradient(160deg,#F0ECFF,#E8F4FF,#F0FFF8)',
          fontFamily: 'Inter,sans-serif', padding: 24, textAlign: 'center',
        }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#1a1040,#0D1A2E)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(108,99,255,0.35)' }}>
            <span style={{ background:'linear-gradient(135deg,#a78bfa,#38bdf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontSize:20, fontWeight:900 }}>SS</span>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'#1a1a2e' }}>เกิดข้อผิดพลาด</div>
          <div style={{ fontSize:13, color:'#9ca3af', maxWidth:300 }}>
            {this.state.error?.message || 'Something went wrong'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:12, fontSize:14, color:'white', cursor:'pointer', fontFamily:'inherit', fontWeight:600, boxShadow:'0 4px 16px rgba(108,99,255,0.35)' }}>
            โหลดใหม่
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
