// app/api/line/richmenu/route.js
// One-shot setup of the StayScape LINE rich menu.
// Open once after deploy:  /api/line/richmenu?secret=<CRON_SECRET>
//   ?action=clear  → remove all rich menus instead.
import { NextResponse } from 'next/server'

const LINE_TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL || 'https://worklog-app-virid.vercel.app'
const CRON_SECRET = process.env.CRON_SECRET || ''

const api = (path, init) => fetch('https://api.line.me' + path, {
  ...init,
  headers: { Authorization: 'Bearer ' + LINE_TOKEN, ...(init?.headers || {}) },
})

const richMenu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'StayScape Menu',
  chatBarText: 'เมนู StayScape',
  areas: [
    { bounds: { x: 0,    y: 0,    width: 1000, height: 1686 }, action: { type: 'uri',     uri: APP_URL } },
    { bounds: { x: 1000, y: 0,    width: 750,  height: 562  }, action: { type: 'message', text: 'งานวันนี้' } },
    { bounds: { x: 1750, y: 0,    width: 750,  height: 562  }, action: { type: 'message', text: 'งานค้าง' } },
    { bounds: { x: 1000, y: 562,  width: 750,  height: 562  }, action: { type: 'message', text: 'แดชบอร์ด' } },
    { bounds: { x: 1750, y: 562,  width: 750,  height: 562  }, action: { type: 'message', text: 'รายงานเดือนนี้' } },
    { bounds: { x: 1000, y: 1124, width: 750,  height: 562  }, action: { type: 'uri', uri: APP_URL + '/?page=calendar' } },
    { bounds: { x: 1750, y: 1124, width: 750,  height: 562  }, action: { type: 'message', text: '/help' } },
  ],
}

async function clearAll() {
  const list = await api('/v2/bot/richmenu/list').then(r => r.json()).catch(() => ({}))
  const ids = (list.richmenus || []).map(m => m.richMenuId)
  for (const id of ids) await api('/v2/bot/richmenu/' + id, { method: 'DELETE' }).catch(() => {})
  return ids.length
}

export async function GET(request) {
  if (!LINE_TOKEN) return NextResponse.json({ error: 'LINE token not configured' }, { status: 500 })
  const url = new URL(request.url)
  if (CRON_SECRET && url.searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    if (url.searchParams.get('action') === 'clear') {
      const n = await clearAll()
      return NextResponse.json({ ok: true, cleared: n })
    }

    // Replace any existing menus so we don't pile up duplicates.
    await clearAll()

    // 1) Create the rich menu object.
    const created = await api('/v2/bot/richmenu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(richMenu),
    })
    const createdJson = await created.json()
    if (!created.ok) return NextResponse.json({ step: 'create', error: createdJson }, { status: 500 })
    const richMenuId = createdJson.richMenuId

    // 2) Upload the image (fetched from our own static asset).
    const imgRes = await fetch(APP_URL + '/richmenu.png')
    if (!imgRes.ok) return NextResponse.json({ step: 'fetch-image', error: 'cannot read /richmenu.png' }, { status: 500 })
    const imgBuf = Buffer.from(await imgRes.arrayBuffer())
    const up = await fetch('https://api-data.line.me/v2/bot/richmenu/' + richMenuId + '/content', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + LINE_TOKEN, 'Content-Type': 'image/png' },
      body: imgBuf,
    })
    if (!up.ok) return NextResponse.json({ step: 'upload', error: await up.text() }, { status: 500 })

    // 3) Set as the default rich menu for all users.
    const def = await api('/v2/bot/user/all/richmenu/' + richMenuId, { method: 'POST' })
    if (!def.ok) return NextResponse.json({ step: 'set-default', error: await def.text() }, { status: 500 })

    return NextResponse.json({ ok: true, richMenuId, message: 'Rich menu created & set as default ✅' })
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
