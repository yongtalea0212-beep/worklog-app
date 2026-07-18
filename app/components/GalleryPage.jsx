"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const CATS = [
  { id:'all',       label:'ทั้งหมด',       color:'#6C63FF' },
  { id:'graphic',   label:'Graphic',       color:'#6C63FF' },
  { id:'video',     label:'Video',         color:'#06B6D4' },
  { id:'photo',     label:'Photo',         color:'#F59E0B' },
  { id:'marketing', label:'Marketing',     color:'#EF4444' },
  { id:'ai',        label:'AI',            color:'#8B5CF6' },
  { id:'branding',  label:'Branding',      color:'#EC4899' },
  { id:'pos',       label:'POS',           color:'#10B981' },
  { id:'other',     label:'อื่นๆ',         color:'#64748B' },
]

const SORT_OPTIONS = [
  { id:'newest',  label:'ใหม่สุด' },
  { id:'oldest',  label:'เก่าสุด' },
  { id:'name',    label:'ชื่อ A-Z' },
  { id:'size',    label:'ขนาดไฟล์' },
]

const BUCKET = 'worklog-gallery'

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(s) {
  try { return new Date(s).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' }) }
  catch { return s }
}

function isVideo(url) {
  return /\.(mp4|mov|webm|avi)$/i.test(url || '')
}

function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url || '')
}

async function callAI(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    return data.text || ''
  } catch { return '' }
}

// ─────────────────────────────────────────
// SUPABASE STORAGE HELPERS
// ─────────────────────────────────────────
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some(b => b.name === BUCKET)
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, { public: true })
    }
    return true
  } catch { return false }
}

async function getUid() {
  try { const { data } = await supabase.auth.getSession(); return data?.session?.user?.id || null }
  catch { return null }
}

async function uploadFile(file, category = 'other', uid = null) {
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Per-user prefix → users never see each other's gallery files.
  const path = (uid ? uid + '/' : '') + category + '/' + timestamp + '_' + safeName

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return {
    id: timestamp + '_' + Math.random().toString(36).slice(2),
    filename: file.name,
    path,
    url: urlData.publicUrl,
    category,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    tags: [],
    aiTags: [],
  }
}

async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

async function listFiles(uid) {
  if (!uid) return []
  const cats = CATS.filter(c => c.id !== 'all').map(c => c.id)
  const allFiles = []

  for (const cat of cats) {
    const prefix = uid + '/' + cat
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 200, sortBy: { column: 'created_at', order: 'desc' }
    })
    if (error || !data) continue

    for (const file of data) {
      if (!file.name || file.name === '.emptyFolderPlaceholder') continue
      const path = prefix + '/' + file.name
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      allFiles.push({
        id: file.id || path,
        filename: file.name,
        path,
        url: urlData.publicUrl,
        category: cat,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || '',
        uploadedAt: file.created_at || new Date().toISOString(),
        tags: [],
        aiTags: [],
      })
    }
  }
  return allFiles
}

// ─────────────────────────────────────────
// GALLERY CSS
// ─────────────────────────────────────────
const GALLERY_CSS = `
.gal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.gal-card {
  background: rgba(255,255,255,0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.9);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 12px rgba(100,110,200,0.08);
  position: relative;
}
.gal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(100,110,200,0.16);
  border-color: rgba(108,99,255,0.25);
}
.gal-card:hover .gal-actions {
  opacity: 1;
}
.gal-thumb {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
  background: rgba(108,99,255,0.06);
}
.gal-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}
.gal-action-btn {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(255,255,255,0.98);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.15s;
}
.gal-action-btn:hover { transform: scale(1.1); }
.gal-drop-zone {
  border: 2px dashed rgba(108,99,255,0.3);
  border-radius: 20px;
  padding: 32px 20px;
  text-align: center;
  background: rgba(108,99,255,0.03);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}
.gal-drop-zone:hover,
.gal-drop-zone.drag-over {
  border-color: rgba(108,99,255,0.6);
  background: rgba(108,99,255,0.07);
}
.gal-skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 12px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.gal-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(10,12,30,0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 300;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: fadeIn .2s ease;
}
.gal-modal-img {
  max-width: min(90vw, 900px);
  max-height: 80vh;
  border-radius: 16px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6);
  object-fit: contain;
}
.pill-tab {
  padding: 5px 13px; border-radius: 20px;
  font-size: 12px; font-weight: 500;
  cursor: pointer; border: 1px solid;
  transition: all .15s; font-family: inherit;
}
.pill-tab.active {
  font-weight: 600;
}
.prog-bar {
  height: 4px; border-radius: 2px;
  background: rgba(108,99,255,0.15);
  overflow: hidden; margin-top: 8px;
}
.prog-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #6C63FF, #9B8FFF);
  transition: width 0.3s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
`

// ─────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="gal-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(100,110,200,0.08)' }}>
          <div className="gal-skeleton" style={{ width:'100%', aspectRatio:'1', borderRadius:0 }}/>
          <div style={{ padding:'10px 12px', background:'rgba(255,255,255,0.65)' }}>
            <div className="gal-skeleton" style={{ height:10, width:'70%', marginBottom:6 }}/>
            <div className="gal-skeleton" style={{ height:8, width:'40%' }}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// IMAGE PREVIEW MODAL
// ─────────────────────────────────────────
function PreviewModal({ file, onClose, onDelete }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!file) return null
  const isVid = isVideo(file.url)
  const cat = CATS.find(c => c.id === file.category) || CATS[0]

  async function handleDownload() {
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.filename
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="gal-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position:'relative', animation:'slideUp .25s ease', maxWidth:'min(90vw,900px)', width:'100%' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute', top:-44, right:0, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, color:'white', fontSize:18, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>

        {/* Media */}
        {isVid ? (
          <video src={file.url} controls style={{ width:'100%', maxHeight:'75vh', borderRadius:16, display:'block', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}/>
        ) : (
          <img src={file.url} alt={file.filename} className="gal-modal-img" style={{ width:'100%', display:'block' }}/>
        )}

        {/* Info bar */}
        <div style={{ marginTop:14, background:'rgba(255,255,255,0.1)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'white', marginBottom:2 }}>{file.filename}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>
              {formatDate(file.uploadedAt)} · {formatBytes(file.size)}
              <span style={{ marginLeft:8, background:cat.color+'30', color:cat.color, fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:600 }}>{cat.label}</span>
            </div>
          </div>
          {file.aiTags?.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {file.aiTags.map((t,i) => (
                <span key={i} style={{ background:'rgba(108,99,255,0.3)', color:'white', fontSize:10, padding:'2px 7px', borderRadius:20 }}>#{t}</span>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:7 }}>
            <button onClick={handleDownload} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:9, color:'white', fontSize:12, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>📥 Download</button>
            <button onClick={() => { onDelete(file); onClose() }} style={{ background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:9, color:'#FCA5A5', fontSize:12, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>🗑 ลบ</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// GALLERY CARD
// ─────────────────────────────────────────
function GalleryCard({ file, onPreview, onDelete }) {
  const [imgError, setImgError] = useState(false)
  const cat = CATS.find(c => c.id === file.category) || CATS[8]
  const isVid = isVideo(file.url)

  return (
    <div className="gal-card" onClick={() => onPreview(file)}>
      {/* Thumbnail */}
      {isVid ? (
        <div style={{ width:'100%', aspectRatio:'1', background:'rgba(6,182,212,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🎬</div>
      ) : imgError ? (
        <div style={{ width:'100%', aspectRatio:'1', background:'rgba(108,99,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, flexDirection:'column', gap:6 }}>
          <span>🖼️</span>
          <span style={{ fontSize:10, color:'#9ca3af' }}>ไม่สามารถโหลดรูปได้</span>
        </div>
      ) : (
        <img
          src={file.url}
          alt={file.filename}
          className="gal-thumb"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      )}

      {/* Actions overlay */}
      <div className="gal-actions">
        <button className="gal-action-btn" title="Preview" onClick={e => { e.stopPropagation(); onPreview(file) }}>👁️</button>
        <button className="gal-action-btn" title="Download" onClick={e => { e.stopPropagation(); const a = document.createElement('a'); a.href=file.url; a.download=file.filename; a.target='_blank'; a.click() }}>📥</button>
        <button className="gal-action-btn" title="Delete" onClick={e => { e.stopPropagation(); onDelete(file) }}>🗑</button>
      </div>

      {/* Video badge */}
      {isVid && (
        <div style={{ position:'absolute', top:8, left:8, background:'rgba(6,182,212,0.85)', color:'white', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, letterSpacing:0.5 }}>VIDEO</div>
      )}

      {/* Info */}
      <div style={{ padding:'10px 12px' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={file.filename}>
          {file.filename}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          <span style={{ background:cat.color+'15', color:cat.color, fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:20, letterSpacing:0.3 }}>{cat.label}</span>
          <span style={{ fontSize:10, color:'#9ca3af' }}>{formatBytes(file.size)}</span>
        </div>
        {file.aiTags?.length > 0 && (
          <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:5 }}>
            {file.aiTags.slice(0,3).map((t,i) => (
              <span key={i} style={{ background:'rgba(108,99,255,0.08)', color:'#6C63FF', fontSize:9, padding:'1px 6px', borderRadius:20 }}>#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// UPLOAD DROPZONE
// ─────────────────────────────────────────
function UploadDropzone({ onUpload, uploading, progress, uploadCategory, setUploadCategory }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (files.length) onUpload(files)
  }

  function handleChange(e) {
    const files = Array.from(e.target.files)
    if (files.length) onUpload(files)
    e.target.value = ''
  }

  return (
    <div>
      {/* Category selector */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:0.5 }}>อัปโหลดไปยังหมวด:</span>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {CATS.filter(c => c.id !== 'all').map(cat => (
            <button key={cat.id} onClick={() => setUploadCategory(cat.id)} style={{
              padding:'4px 11px', borderRadius:20, border:'1px solid',
              borderColor: uploadCategory === cat.id ? cat.color + '60' : 'rgba(200,210,240,0.5)',
              background: uploadCategory === cat.id ? cat.color + '12' : 'rgba(255,255,255,0.5)',
              color: uploadCategory === cat.id ? cat.color : '#9ca3af',
              fontSize:11, fontWeight: uploadCategory === cat.id ? 700 : 400,
              cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
            }}>{cat.label}</button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={'gal-drop-zone' + (dragging ? ' drag-over' : '')}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{ opacity: uploading ? 0.7 : 1, cursor: uploading ? 'default' : 'pointer' }}
      >
        <div style={{ fontSize:36, marginBottom:10 }}>{uploading ? '⏳' : '☁️'}</div>
        <div style={{ fontSize:14, fontWeight:600, color:'#1a1a2e', marginBottom:5 }}>
          {uploading ? 'กำลังอัปโหลด...' : 'ลากไฟล์มาวางตรงนี้'}
        </div>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom: uploading ? 10 : 0 }}>
          {uploading ? 'รอสักครู่...' : 'หรือคลิกเพื่อเลือกไฟล์ · JPG, PNG, GIF, MP4, MOV'}
        </div>
        {uploading && (
          <div className="prog-bar" style={{ maxWidth:240, margin:'0 auto' }}>
            <div className="prog-fill" style={{ width: progress + '%' }}/>
          </div>
        )}
        {!uploading && (
          <button onClick={e => { e.stopPropagation(); fileRef.current?.click() }} style={{
            marginTop:12, padding:'7px 18px',
            background:'linear-gradient(135deg,#6C63FF,#9B8FFF)',
            border:'none', borderRadius:9, color:'white',
            fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          }}>เลือกไฟล์</button>
        )}
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{ display:'none' }} onChange={handleChange}/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN GALLERY PAGE
// ─────────────────────────────────────────
export default function GalleryPage({ logs }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [uploadCategory, setUploadCategory] = useState('graphic')
  const [toast, setToast] = useState(null)
  const [aiTagging, setAiTagging] = useState(false)
  const [storageError, setStorageError] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load files from Supabase Storage
  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      await ensureBucket()
      const uid = await getUid()
      const data = await listFiles(uid)
      setFiles(data)
      setStorageError(false)
    } catch (err) {
      setStorageError(true)
      // Fallback: load from logs imageUrls
      const fromLogs = (logs || []).flatMap(l =>
        (l.imageUrls || []).map(url => ({
          id: url,
          filename: url.split('/').pop(),
          url,
          category: l.category || 'other',
          size: 0,
          type: 'image/jpeg',
          uploadedAt: l.date,
          tags: l.tags || [],
          aiTags: [],
        }))
      )
      setFiles(fromLogs)
    }
    setLoading(false)
  }, [logs])

  useEffect(() => { loadFiles() }, [loadFiles])

  // Upload handler
  async function handleUpload(fileList) {
    setUploading(true)
    setProgress(0)
    const total = fileList.length
    const uploaded = []
    const uid = await getUid()

    for (let i = 0; i < total; i++) {
      try {
        const result = await uploadFile(fileList[i], uploadCategory, uid)
        uploaded.push(result)
        setProgress(Math.round(((i + 1) / total) * 100))
      } catch (err) {
        console.error('Upload error:', err)
        showToast('อัปโหลดไม่สำเร็จ: ' + fileList[i].name, 'error')
      }
    }

    if (uploaded.length > 0) {
      setFiles(prev => [...uploaded, ...prev])
      showToast('อัปโหลด ' + uploaded.length + ' ไฟล์เรียบร้อย')

      // Auto AI tag first image
      if (uploaded[0] && isImage(uploaded[0].url)) {
        autoTagImage(uploaded[0])
      }
    }

    setUploading(false)
    setProgress(0)
  }

  // AI auto-tag
  async function autoTagImage(file) {
    setAiTagging(true)
    try {
      const prompt = [
        'ดูที่ URL ของรูปนี้และตั้งชื่อ tag ภาษาอังกฤษสั้นๆ 3-5 คำ สำหรับรูป:',
        file.filename,
        'หมวด: ' + file.category,
        'ตอบเป็น JSON array เท่านั้น เช่น ["design","poster","marketing"]',
      ].join('\n')
      const text = await callAI(prompt)
      const clean = text.replace(/```json|```/g, '').trim()
      const tags = JSON.parse(clean)
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, aiTags: tags } : f))
    } catch { /* silent */ }
    setAiTagging(false)
  }

  // Delete file
  async function handleDelete(file) {
    if (!confirm('ลบไฟล์ "' + file.filename + '" ใช่ไหม?')) return
    try {
      if (file.path) await deleteFile(file.path)
      setFiles(prev => prev.filter(f => f.id !== file.id))
      showToast('ลบไฟล์แล้ว')
    } catch {
      showToast('ลบไม่สำเร็จ', 'error')
    }
  }

  // Filter & sort
  const filtered = files
    .filter(f => filter === 'all' || f.category === filter)
    .filter(f => !search || f.filename.toLowerCase().includes(search.toLowerCase()) || f.aiTags?.some(t => t.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.uploadedAt) - new Date(a.uploadedAt)
      if (sort === 'oldest') return new Date(a.uploadedAt) - new Date(b.uploadedAt)
      if (sort === 'name') return a.filename.localeCompare(b.filename)
      if (sort === 'size') return b.size - a.size
      return 0
    })

  // Stats
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0)
  const imageCount = files.filter(f => isImage(f.url)).length
  const videoCount = files.filter(f => isVideo(f.url)).length

  return (
    <>
      <style>{GALLERY_CSS}</style>

      {/* Page header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a1a2e' }}>Gallery</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>
              {files.length} ไฟล์ · {formatBytes(totalSize)} · {imageCount} รูป · {videoCount} วิดีโอ
            </div>
          </div>
          <button onClick={loadFiles} style={{ padding:'7px 14px', background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:9, fontSize:12, color:'#6b7099', cursor:'pointer', fontFamily:'inherit' }}>
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      {/* Storage error warning */}
      {storageError && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#B45309' }}>
          ⚠️ Supabase Storage bucket ยังไม่ได้ตั้งค่า — ไฟล์ที่แสดงมาจาก work logs แทน กรุณาสร้าง bucket ชื่อ "{BUCKET}" ใน Supabase Storage
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { icon:'🖼️', label:'รูปภาพ',  value:imageCount,          color:'#6C63FF' },
          { icon:'🎬', label:'วิดีโอ',   value:videoCount,          color:'#06B6D4' },
          { icon:'💾', label:'ขนาดรวม', value:formatBytes(totalSize), color:'#10B981' },
          { icon:'📁', label:'ไฟล์ทั้งหมด', value:files.length,    color:'#F59E0B' },
        ].map((s, i) => (
          <div key={i} style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.9)', borderRadius:14, padding:'12px 14px', boxShadow:'0 2px 10px rgba(100,110,200,0.07)' }}>
            <div style={{ fontSize:11, color:'#9ca3af', marginBottom:5 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <UploadDropzone
        onUpload={handleUpload}
        uploading={uploading}
        progress={progress}
        uploadCategory={uploadCategory}
        setUploadCategory={setUploadCategory}
      />

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#9ca3af' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อไฟล์หรือแท็ก..."
            style={{ width:'100%', padding:'8px 12px 8px 32px', background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:12, color:'#1a1a2e', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding:'8px 12px', background:'rgba(255,255,255,0.6)', border:'1px solid rgba(200,210,240,0.5)', borderRadius:10, fontSize:12, color:'#6b7099', fontFamily:'inherit', outline:'none' }}>
          {SORT_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* Count */}
        <div style={{ fontSize:12, color:'#9ca3af', flexShrink:0 }}>{filtered.length} ไฟล์</div>
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {CATS.map(cat => {
          const count = cat.id === 'all' ? files.length : files.filter(f => f.category === cat.id).length
          return (
            <button key={cat.id} onClick={() => setFilter(cat.id)} className="pill-tab" style={{
              borderColor: filter === cat.id ? cat.color + '50' : 'rgba(200,210,240,0.5)',
              background: filter === cat.id ? cat.color + '12' : 'rgba(255,255,255,0.5)',
              color: filter === cat.id ? cat.color : '#9ca3af',
            }}>
              {cat.label} {count > 0 && <span style={{ opacity:0.7, fontSize:10 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign:'center', padding:'60px 20px',
          background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.9)',
          borderRadius:22, boxShadow:'0 4px 20px rgba(100,110,200,0.07)',
        }}>
          <div style={{ fontSize:56, marginBottom:14 }}>🖼️</div>
          <div style={{ fontSize:16, fontWeight:600, color:'#1a1a2e', marginBottom:6 }}>
            {search ? 'ไม่พบไฟล์ที่ตรงกับคำค้นหา' : files.length === 0 ? 'ยังไม่มีไฟล์ใน Gallery' : 'ไม่มีไฟล์ในหมวดนี้'}
          </div>
          <div style={{ fontSize:13, color:'#9ca3af', marginBottom:20, lineHeight:1.6 }}>
            {search ? 'ลองค้นหาด้วยคำอื่น หรือล้างตัวกรอง' : 'ลากรูปหรือวิดีโอมาวางในช่องด้านบน หรือกดปุ่ม "เลือกไฟล์"'}
          </div>
          {!search && (
            <button onClick={() => document.querySelector('.gal-drop-zone')?.click()} style={{ padding:'9px 22px', background:'linear-gradient(135deg,#6C63FF,#9B8FFF)', border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 14px rgba(108,99,255,0.3)' }}>
              + อัปโหลดไฟล์แรก
            </button>
          )}
        </div>
      ) : (
        <div className="gal-grid">
          {filtered.map(file => (
            <GalleryCard
              key={file.id}
              file={file}
              onPreview={setPreview}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Hint */}
      {files.length > 0 && (
        <div style={{ marginTop:12, fontSize:11, color:'#9ca3af', textAlign:'center' }}>
          Hover บนรูปเพื่อดู actions · คลิกเพื่อ preview เต็มจอ
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <PreviewModal
          file={preview}
          onClose={() => setPreview(null)}
          onDelete={file => { handleDelete(file) }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:28, right:28, zIndex:400,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(26,29,46,0.92)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          color:'white', border:'1px solid rgba(255,255,255,0.15)',
          borderRadius:12, padding:'11px 18px', fontSize:13, fontWeight:500,
          boxShadow:'0 8px 30px rgba(0,0,0,0.2)',
          animation:'slideUp .3s ease', display:'flex', alignItems:'center', gap:8,
        }}>
          {toast.type === 'error' ? '⚠️' : '✦'} {toast.msg}
        </div>
      )}
    </>
  )
}
