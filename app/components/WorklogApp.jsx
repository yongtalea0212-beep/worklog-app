"use client"
import { supabase } from '../lib/supabase'
import GalleryPageFull from './GalleryPage'
import { useState, useEffect, useRef } from "react"
import { downloadReportPDF } from './ReportPDF'
import CalendarPage from './CalendarPage'
import AIAssistantPage from './AIAssistantPage'
import SmartProductivityPanel from './SmartProductivityPanel'
import SmartWorklogWorkspace from './SmartWorklogWorkspace'
import PresentationStudio from './PresentationStudio'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// ─────────────────────────────────────────
// STYLES — Light Glassmorphism
// ─────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* ── Colors ── */
  --bg: linear-gradient(135deg,#E8EAF6 0%,#EDE7F6 25%,#E3F2FD 50%,#E8F5E9 75%,#FFF8E1 100%);
  --card: rgba(255,255,255,0.68);
  --card-h: rgba(255,255,255,0.88);
  --card-border: rgba(255,255,255,0.92);
  --sidebar: rgba(255,255,255,0.58);
  --text: #1a1a2e;
  --text2: #4a5568;
  --text3: #9ca3af;
  --accent: #6C63FF;
  --accent2: #06B6D4;
  --accent3: #10B981;
  --pink: #EC4899;
  --amber: #F59E0B;
  --red: #EF4444;
  --blur: blur(24px);
  --shadow: 0 8px 32px rgba(100,110,200,0.13), 0 2px 8px rgba(100,110,200,0.08);
  --shadow-h: 0 16px 48px rgba(100,110,200,0.2), 0 4px 16px rgba(100,110,200,0.13);
  --shadow-card: 0 4px 24px rgba(100,110,200,0.1), inset 0 1px 0 rgba(255,255,255,0.85);

  /* ── Radii ── */
  --r-sm: 12px;
  --r-md: 18px;
  --r-lg: 24px;
  --r-xl: 32px;

  /* ── Typography ── */
  --font: 'Inter', sans-serif;
  --text-xs:   13px;
  --text-sm:   14px;
  --text-base: 16px;
  --text-md:   17px;
  --text-lg:   20px;
  --text-xl:   24px;
  --text-2xl:  32px;
  --text-3xl:  42px;

  /* ── Spacing ── */
  --sp-1: 6px;
  --sp-2: 10px;
  --sp-3: 16px;
  --sp-4: 22px;
  --sp-5: 30px;
  --sp-6: 40px;
}

html, body {
  font-family: var(--font);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
}

body {
  background: var(--bg);
  background-attachment: fixed;
  min-height: 100vh;
  position: relative;
}

body::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 15% 10%, rgba(200,190,255,0.4) 0%, transparent 55%),
    radial-gradient(ellipse 55% 45% at 85% 15%, rgba(180,220,255,0.35) 0%, transparent 50%),
    radial-gradient(ellipse 45% 40% at 70% 80%, rgba(160,240,210,0.3) 0%, transparent 55%),
    radial-gradient(ellipse 40% 35% at 20% 85%, rgba(255,230,180,0.25) 0%, transparent 50%);
  pointer-events: none; z-index: 0;
}

.app { display: flex; min-height: 100vh; position: relative; z-index: 1; }

/* ════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════ */
.sb {
  width: 290px;
  flex-shrink: 0;
  background: var(--sidebar);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border-right: 1px solid rgba(255,255,255,0.72);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  box-shadow: 4px 0 24px rgba(100,110,200,0.08);
}

.sb-logo {
  padding: 24px 20px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.65);
}

.logo-mark {
  width: 40px; height: 40px;
  border-radius: 13px;
  background: linear-gradient(135deg, #6C63FF, #A78BFA);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  box-shadow: 0 4px 14px rgba(108,99,255,0.4);
  flex-shrink: 0;
}

.sb-search {
  margin: 12px 14px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.85);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  display: flex; align-items: center; gap: 9px;
  cursor: pointer;
  color: var(--text3);
  font-size: var(--text-sm);
  font-family: var(--font);
  transition: .15s;
  box-shadow: 0 2px 8px rgba(100,110,200,0.06);
}

.sb-search:hover {
  background: rgba(255,255,255,0.75);
  border-color: rgba(108,99,255,0.32);
  color: var(--text);
}

.sb-search kbd {
  margin-left: auto;
  background: rgba(108,99,255,0.09);
  border: 1px solid rgba(108,99,255,0.18);
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 11px;
  color: var(--accent);
  font-family: var(--font);
}

.sb-section {
  font-size: 11px;
  font-weight: 700;
  color: var(--text3);
  letter-spacing: 1.3px;
  padding: 14px 18px 6px;
  text-transform: uppercase;
}

.nav {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 14px;
  border-radius: var(--r-sm);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  border: none;
  background: transparent;
  width: calc(100% - 22px);
  margin: 2px 11px;
  text-align: left;
  transition: .15s;
  font-family: var(--font);
  line-height: 1.4;
}

.nav:hover { background: rgba(255,255,255,0.65); color: var(--text); }

.nav.on {
  background: rgba(108,99,255,0.11);
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(108,99,255,0.13);
  border: 1px solid rgba(108,99,255,0.18);
}

.nav-icon {
  width: 30px; height: 30px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.55);
}

.nav.on .nav-icon { background: rgba(108,99,255,0.15); }

.nav-badge {
  margin-left: auto;
  background: rgba(108,99,255,0.13);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}

.sb-foot {
  margin-top: auto;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,0.65);
}

.sb-user {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: rgba(255,255,255,0.52);
  border: 1px solid rgba(255,255,255,0.75);
  cursor: pointer;
  transition: .15s;
}

.sb-user:hover { background: rgba(255,255,255,0.75); }

.sb-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C63FF, #06B6D4);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  color: white; flex-shrink: 0;
}

.sb-upgrade {
  margin: 0 14px 12px;
  background: linear-gradient(135deg, rgba(108,99,255,0.13), rgba(167,139,250,0.08));
  border: 1px solid rgba(108,99,255,0.2);
  border-radius: var(--r-md);
  padding: 12px 14px;
}

.upgrade-badge {
  font-size: 11px;
  font-weight: 700;
  background: linear-gradient(135deg, #6C63FF, #A78BFA);
  color: white;
  padding: 3px 10px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 6px;
  letter-spacing: .3px;
}

/* ════════════════════════════════════════
   MAIN AREA
════════════════════════════════════════ */
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.topbar {
  padding: 16px 32px;
  background: rgba(255,255,255,0.55);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border-bottom: 1px solid rgba(255,255,255,0.75);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0; z-index: 10;
  box-shadow: 0 2px 16px rgba(100,110,200,0.08);
}

.content { padding: 28px 32px; overflow-y: auto; flex: 1; }

/* ════════════════════════════════════════
   BUTTONS
════════════════════════════════════════ */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 22px;
  border-radius: var(--r-sm);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: .15s;
  font-family: var(--font);
  line-height: 1;
}

.btn:hover { transform: translateY(-1px); }
.btn:active { transform: scale(.98); }

.btn-primary {
  background: linear-gradient(135deg, #6C63FF, #9B8FFF);
  color: white;
  box-shadow: 0 4px 14px rgba(108,99,255,0.35);
}

.btn-primary:hover { box-shadow: 0 6px 20px rgba(108,99,255,0.45); }

.btn-ghost {
  background: rgba(255,255,255,0.65);
  color: var(--text2);
  border: 1px solid rgba(255,255,255,0.88);
  box-shadow: 0 2px 8px rgba(100,110,200,0.08);
}

.btn-ghost:hover { background: rgba(255,255,255,0.9); color: var(--text); }

.btn-sm { padding: 8px 16px; font-size: var(--text-sm); }

.btn-danger {
  background: rgba(239,68,68,0.09);
  color: var(--red);
  border: 1px solid rgba(239,68,68,0.22);
}

/* ════════════════════════════════════════
   CARDS
════════════════════════════════════════ */
.card {
  background: var(--card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--card-border);
  border-radius: var(--r-lg);
  padding: 24px;
  box-shadow: var(--shadow-card);
  transition: .2s;
}

.card:hover { background: var(--card-h); box-shadow: var(--shadow-h); }

.card-t {
  font-size: 11px;
  font-weight: 700;
  color: var(--text3);
  letter-spacing: 1.2px;
  margin-bottom: 16px;
  text-transform: uppercase;
}

/* ════════════════════════════════════════
   HERO
════════════════════════════════════════ */
.hero {
  border-radius: var(--r-xl);
  padding: 34px 38px;
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(6,182,212,0.06) 50%, rgba(16,185,129,0.05) 100%);
  border: 1px solid rgba(255,255,255,0.92);
  box-shadow: var(--shadow-card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
}

.hero-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }

/* ════════════════════════════════════════
   KPI CARDS
════════════════════════════════════════ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi {
  background: var(--card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--card-border);
  border-radius: var(--r-lg);
  padding: 22px 24px;
  position: relative;
  overflow: hidden;
  transition: .2s;
  cursor: default;
  box-shadow: var(--shadow-card);
}

.kpi:hover { transform: translateY(-3px); box-shadow: var(--shadow-h); }

/* ════════════════════════════════════════
   GRID LAYOUTS
════════════════════════════════════════ */
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
.g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 18px; }
.g3-1 { display: grid; grid-template-columns: 1fr 320px; gap: 18px; margin-bottom: 18px; }

/* ════════════════════════════════════════
   CHART
════════════════════════════════════════ */
.chart-wrap { width: 100%; height: 170px; }

/* ════════════════════════════════════════
   HEATMAP
════════════════════════════════════════ */
.hm-row { display: flex; flex-wrap: wrap; gap: 4px; }
.hm-cell { width: 14px; height: 14px; border-radius: 3px; transition: .15s; cursor: default; }
.hm-cell:hover { transform: scale(1.5); }

/* ════════════════════════════════════════
   TIMELINE
════════════════════════════════════════ */
.tl-item { display: flex; gap: 12px; padding: 11px 0; position: relative; }
.tl-item:not(:last-child)::before {
  content: ''; position: absolute;
  left: 15px; top: 38px; bottom: -11px;
  width: 1px; background: rgba(108,99,255,0.15);
}
.tl-dot {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* ════════════════════════════════════════
   BADGES
════════════════════════════════════════ */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: .2px;
}

/* ════════════════════════════════════════
   LOG CARDS
════════════════════════════════════════ */
.log-card {
  background: var(--card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--card-border);
  border-radius: var(--r-md);
  padding: 16px 18px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: .2s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(100,110,200,0.07);
}

.log-card:hover { background: var(--card-h); transform: translateX(3px); box-shadow: var(--shadow); }
.log-acc { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 4px 0 0 4px; }

/* ════════════════════════════════════════
   FORM INPUTS
════════════════════════════════════════ */
.label {
  display: block;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text3);
  margin-bottom: 7px;
  letter-spacing: .6px;
  text-transform: uppercase;
}

.input {
  width: 100%;
  padding: 11px 15px;
  background: rgba(255,255,255,0.62);
  border: 1px solid rgba(200,210,240,0.55);
  border-radius: var(--r-sm);
  font-size: var(--text-md);
  color: var(--text);
  font-family: var(--font);
  outline: none;
  transition: .15s;
  box-sizing: border-box;
  line-height: 1.5;
}

.input:focus {
  border-color: rgba(108,99,255,0.45);
  background: rgba(255,255,255,0.92);
  box-shadow: 0 0 0 3px rgba(108,99,255,0.1);
}

.textarea { min-height: 100px; resize: vertical; line-height: 1.7; }

/* ════════════════════════════════════════
   AI BOX
════════════════════════════════════════ */
.ai-box {
  background: linear-gradient(135deg, rgba(108,99,255,0.07), rgba(167,139,250,0.04));
  border: 1px solid rgba(108,99,255,0.2);
  border-radius: var(--r-md);
  padding: 16px 18px;
  margin-top: 12px;
}

.ai-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 1px;
  margin-bottom: 7px;
  text-transform: uppercase;
}

/* ════════════════════════════════════════
   TAG
════════════════════════════════════════ */
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(108,99,255,0.1);
  border: 1px solid rgba(108,99,255,0.22);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 20px;
}

/* ════════════════════════════════════════
   COMMAND PALETTE
════════════════════════════════════════ */
.overlay {
  position: fixed; inset: 0;
  background: rgba(100,110,200,0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 200;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 90px;
  animation: fadeIn .15s ease;
}

.cmd-box {
  background: rgba(255,255,255,0.94);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255,255,255,0.99);
  border-radius: var(--r-xl);
  width: 580px;
  max-height: 460px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(100,110,200,0.28);
}

.cmd-input-wrap {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(200,210,240,0.45);
}

.cmd-input {
  background: transparent; border: none; outline: none;
  font-size: 16px;
  color: var(--text);
  font-family: var(--font);
  flex: 1;
}

.cmd-input::placeholder { color: var(--text3); }

.cmd-section {
  font-size: 11px; font-weight: 700;
  color: var(--text3); letter-spacing: 1.2px;
  padding: 10px 16px 5px;
  text-transform: uppercase;
}

.cmd-items { padding: 8px; max-height: 360px; overflow-y: auto; }

.cmd-item {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 14px;
  border-radius: var(--r-sm);
  cursor: pointer; transition: .1s;
}

.cmd-item:hover, .cmd-item.sel { background: rgba(108,99,255,0.09); }

.cmd-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}

/* ════════════════════════════════════════
   MODAL
════════════════════════════════════════ */
.modal-wrap {
  position: fixed; inset: 0;
  background: rgba(100,110,200,0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: fadeIn .2s ease;
}

.modal {
  background: rgba(255,255,255,0.93);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255,255,255,0.99);
  border-radius: var(--r-xl);
  max-width: 640px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  padding: 32px;
  box-shadow: 0 30px 80px rgba(100,110,200,0.22);
  animation: slideUp .2s ease;
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
.toast {
  position: fixed; bottom: 32px; right: 32px;
  background: rgba(255,255,255,0.93);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--text);
  border: 1px solid rgba(255,255,255,0.99);
  border-radius: var(--r-md);
  padding: 14px 22px;
  font-size: var(--text-base);
  font-weight: 500;
  box-shadow: var(--shadow);
  z-index: 300;
  animation: slideUp .3s ease;
  display: flex; align-items: center; gap: 9px;
}

/* ════════════════════════════════════════
   FILTER PILLS
════════════════════════════════════════ */
.pill {
  padding: 7px 15px;
  border-radius: 20px;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(200,210,240,0.55);
  background: rgba(255,255,255,0.55);
  color: var(--text2);
  transition: .15s;
  font-family: var(--font);
}

.pill.on {
  background: rgba(108,99,255,0.11);
  color: var(--accent);
  border-color: rgba(108,99,255,0.28);
  font-weight: 600;
}

/* ════════════════════════════════════════
   EMPTY + COMING SOON
════════════════════════════════════════ */
.empty { text-align: center; padding: 70px 24px; color: var(--text3); }

.cs-card {
  background: var(--card);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--card-border);
  border-radius: var(--r-xl);
  padding: 56px 48px;
  box-shadow: var(--shadow-card);
  max-width: 440px; width: 100%;
}

/* ════════════════════════════════════════
   SECTION HEADERS
════════════════════════════════════════ */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: var(--text-lg); font-weight: 600; color: var(--text); }
.section-sub { font-size: var(--text-sm); color: var(--text3); }

/* ════════════════════════════════════════
   ANIMATIONS
════════════════════════════════════════ */
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }

/* ════════════════════════════════════════
   SCROLLBAR
════════════════════════════════════════ */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.22); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(108,99,255,0.38); }
`

// ─────────────────────────────────────────
// DATA
// ─────────────────────────────────────────
const CATS = [
  { id:"graphic",   label:"Graphic",   color:"#6C63FF", bg:"rgba(108,99,255,0.1)",  icon:"🎨" },
  { id:"video",     label:"Video",     color:"#06B6D4", bg:"rgba(6,182,212,0.1)",   icon:"🎬" },
  { id:"photo",     label:"Photo",     color:"#F59E0B", bg:"rgba(245,158,11,0.1)",  icon:"📷" },
  { id:"marketing", label:"Marketing", color:"#EF4444", bg:"rgba(239,68,68,0.1)",   icon:"📢" },
  { id:"ai",        label:"AI",        color:"#8B5CF6", bg:"rgba(139,92,246,0.1)",  icon:"🤖" },
  { id:"branding",  label:"Branding",  color:"#EC4899", bg:"rgba(236,72,153,0.1)",  icon:"✨" },
  { id:"pos",       label:"POS",       color:"#10B981", bg:"rgba(16,185,129,0.1)",  icon:"🏪" },
  { id:"other",     label:"อื่นๆ",     color:"#64748B", bg:"rgba(100,116,139,0.1)", icon:"📌" },
]

const SAMPLE = [
  { id:1, date:"2025-05-07", title:"ออกแบบโปสเตอร์ Hear Go",  category:"graphic",  hours:3, status:"done", tags:["Poster"],  aiSummary:"พัฒนาสื่อโมชั่นโฆษณา Hear Go พร้อมปรับปรุงคุณภาพสีวิดีโอ" },
  { id:2, date:"2025-05-06", title:"ตัดต่อวิดีโอ TikTok",     category:"video",    hours:4, status:"done", tags:["TikTok"],  aiSummary:"ผลิตคอนเทนต์วิดีโอ 2 คลิปสำหรับ TikTok" },
  { id:3, date:"2025-05-05", title:"ถ่ายภาพสินค้า 40 รูป",    category:"photo",    hours:5, status:"done", tags:["Product"], aiSummary:"ถ่ายภาพสินค้าชุดใหม่ White Background และ Lifestyle" },
  { id:4, date:"2025-05-04", title:"Branding Package",         category:"branding", hours:6, status:"done", tags:["Logo"],    aiSummary:"ออกแบบ Corporate Identity Package ครบวงจร" },
  { id:5, date:"2025-05-03", title:"AI Content 10 ชิ้น",       category:"ai",       hours:2, status:"done", tags:["Social"],  aiSummary:"ผลิตคอนเทนต์ AI สำหรับ Facebook และ Instagram" },
  { id:6, date:"2025-05-02", title:"ออกแบบ POS สาขาใหม่",      category:"pos",      hours:4, status:"done", tags:["POS"],     aiSummary:"ออกแบบสื่อ Point of Sale ครบชุดสำหรับสาขาใหม่" },
  { id:7, date:"2025-05-01", title:"แคมเปญ Marketing พ.ค.",    category:"marketing",hours:3, status:"done", tags:["Campaign"],aiSummary:"วางแผนและออกแบบ Campaign ครบวงจร" },
]
const HOURS_OPT = [0.5,1,1.5,2,3,4,5,6,8]

const CMD_ITEMS = [
  { icon:"➕", bg:"rgba(108,99,255,0.15)", name:"เพิ่มงานใหม่",     desc:"บันทึกงานที่ทำวันนี้",  action:"add" },
  { icon:"✨", bg:"rgba(139,92,246,0.15)", name:"สร้างรายงาน AI",   desc:"สรุปผลงานรายเดือน",    action:"report" },
  { icon:"📥", bg:"rgba(239,68,68,0.15)",  name:"Export PDF",        desc:"ดาวน์โหลดรายงาน PDF",  action:"export" },
  { icon:"🖼", bg:"rgba(245,158,11,0.15)", name:"Gallery",           desc:"ดูไฟล์ทั้งหมด",        action:"gallery" },
  { icon:"📋", bg:"rgba(16,185,129,0.15)", name:"รายการงาน",         desc:"งานทั้งหมดของคุณ",     action:"logs" },
  { icon:"◈",  bg:"rgba(236,72,153,0.15)", name:"Portfolio",         desc:"แสดงผลงาน",           action:"portfolio" },
  { icon:"📊", bg:"rgba(6,182,212,0.15)",  name:"Reports",           desc:"ดูรายงาน",             action:"reports" },
]

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
const getCat = id => CATS.find(c=>c.id===id)||CATS[7]
const fmtDate = s => new Date(s).toLocaleDateString("th-TH",{day:"numeric",month:"short"})
const today = () => new Date().toISOString().split("T")[0]

function getStats(logs){
  const total=logs.length, hours=logs.reduce((s,l)=>s+(l.hours||0),0)
  const byCategory={}
  logs.forEach(l=>{ byCategory[l.category]=(byCategory[l.category]||0)+1 })
  const topCat=Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]
  const completionRate=total>0?Math.round((logs.filter(l=>l.status==="done").length/total)*100):0
  const avgHours=total>0?Math.round((hours/total)*10)/10:0
  return{total,hours,byCategory,topCat:topCat?getCat(topCat[0]):null,completionRate,avgHours}
}

function getWeeklyData(logs){
  const w={"W1":0,"W2":0,"W3":0,"W4":0}
  logs.forEach(l=>{ const d=new Date(l.date); const k="W"+Math.ceil(d.getDate()/7); if(w[k]!==undefined)w[k]+=(l.hours||0) })
  return Object.entries(w).map(([name,hours])=>({name,hours:Math.round(hours*10)/10}))
}

function getTrendData(logs){
  const days={}
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days[d.toISOString().split("T")[0]]=0 }
  logs.forEach(l=>{ if(days[l.date]!==undefined)days[l.date]+=(l.hours||0) })
  return Object.entries(days).map(([date,hours])=>({date:fmtDate(date),hours:Math.round(hours*10)/10}))
}

async function callAI(prompt){
  const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})})
  const data=await res.json()
  return data.text||''
}

// ─────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────
function Badge({category}){
  const cat=getCat(category)
  return <span className="badge" style={{background:cat.bg,color:cat.color}}>{cat.icon} {cat.label}</span>
}

function AnimatedNumber({value}){
  const [n,setN]=useState(0)
  useEffect(()=>{
    let start=0,duration=500,startTime=null
    function step(ts){ if(!startTime)startTime=ts; const p=Math.min((ts-startTime)/duration,1); setN(Math.floor(p*value)); if(p<1)requestAnimationFrame(step) }
    requestAnimationFrame(step)
  },[value])
  return <>{n}</>
}

function HeatmapCalendar({logs}){
  const logMap={}
  logs.forEach(l=>{ const d=parseInt(l.date?.split("-")[2]); logMap[d]=(logMap[d]||0)+1 })
  const colors=["rgba(108,99,255,0.07)","rgba(108,99,255,0.28)","rgba(108,99,255,0.55)","#6C63FF"]
  const cells=[]
  for(let i=1;i<=31;i++){
    const n=logMap[i]||0,intensity=n===0?0:n===1?1:n<=2?2:3
    cells.push(<div key={i} className="hm-cell" style={{background:colors[intensity]}} title={`${i}วัน · ${n}งาน`}/>)
  }
  return (
    <div>
      <div style={{fontSize:11,color:"var(--text3)",marginBottom:8}}>พ.ค. 2568</div>
      <div className="hm-row">{cells}</div>
      <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8,fontSize:10,color:"var(--text3)"}}>
        <span>น้อย</span>
        {colors.map((c,i)=><span key={i} style={{width:9,height:9,borderRadius:2,background:c,display:"inline-block"}}/>)}
        <span>มาก</span>
      </div>
    </div>
  )
}

function ActivityTimeline({logs}){
  return (
    <div>
      {logs.slice(0,5).map((l,i)=>{
        const cat=getCat(l.category)
        return (
          <div key={i} className="tl-item">
            <div className="tl-dot" style={{background:cat.bg}}>
              <span style={{fontSize:11}}>{cat.icon}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{l.title}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{l.hours} ชม. · {fmtDate(l.date)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────
// COMMAND PALETTE
// ─────────────────────────────────────────
function CommandPalette({onClose,onAction}){
  const [query,setQuery]=useState("")
  const [sel,setSel]=useState(0)
  const inputRef=useRef()
  const filtered=CMD_ITEMS.filter(i=>!query||i.name.includes(query)||i.desc.includes(query))

  useEffect(()=>{ inputRef.current?.focus() },[])
  useEffect(()=>{
    function onKey(e){
      if(e.key==="Escape")onClose()
      if(e.key==="ArrowDown")setSel(s=>Math.min(s+1,filtered.length-1))
      if(e.key==="ArrowUp")setSel(s=>Math.max(s-1,0))
      if(e.key==="Enter"&&filtered[sel]){onAction(filtered[sel].action);onClose()}
    }
    window.addEventListener("keydown",onKey)
    return()=>window.removeEventListener("keydown",onKey)
  },[filtered,sel])

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="cmd-box">
        <div className="cmd-input-wrap">
          <span style={{fontSize:16,color:"var(--text3)"}}>⌘</span>
          <input ref={inputRef} className="cmd-input" placeholder="ค้นหาคำสั่ง..." value={query} onChange={e=>{setQuery(e.target.value);setSel(0)}}/>
          <kbd style={{background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.15)",borderRadius:5,padding:"2px 7px",fontSize:10,color:"var(--accent)",fontFamily:"var(--font)"}}>ESC</kbd>
        </div>
        <div className="cmd-items">
          <div className="cmd-section">Actions</div>
          {filtered.map((item,i)=>(
            <div key={i} className={`cmd-item ${sel===i?"sel":""}`} onClick={()=>{onAction(item.action);onClose()}} onMouseEnter={()=>setSel(i)}>
              <div className="cmd-icon" style={{background:item.bg}}>{item.icon}</div>
              <div>
                <div className="cmd-name">{item.name}</div>
                <div className="cmd-desc">{item.desc}</div>
              </div>
              {sel===i&&<kbd style={{marginLeft:"auto",background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.2)",borderRadius:5,padding:"2px 7px",fontSize:10,color:"var(--accent)",fontFamily:"var(--font)"}}>↵</kbd>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// LOG FORM
// ─────────────────────────────────────────
function LogForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    title:"", description:"", category:"graphic",
    hours:2, status:"done", tags:[], date:today(),
    imageUrls:[], imageCount:0,
  })
  const labelStyle = {
  display:'block', fontSize:10, fontWeight:700,
  color:'#9ca3af', letterSpacing:1, marginBottom:6, textTransform:'uppercase',
}
  const [aiLoading, setAiLoading] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function uploadToStorage(files) {
    setUploading(true)
    const urls = [...(form.imageUrls || [])]
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()
        const path = form.category + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const { error } = await supabase.storage.from('worklog-gallery').upload(path, file, { cacheControl:'3600', upsert:false })
        if (!error) {
          const { data } = supabase.storage.from('worklog-gallery').getPublicUrl(path)
          urls.push(data.publicUrl)
        }
      } catch {}
    }
    setForm(f => ({ ...f, imageUrls: urls, imageCount: urls.length }))
    setUploading(false)
  }

  async function summarize() {
    if (!form.description.trim()) return
    setAiLoading(true)
    try {
      const text = await callAI(
        'สรุปงานนี้เป็นภาษาไทยระดับมืออาชีพ 1-2 ประโยค เน้นผลลัพธ์: "' + form.description + '" หมวด: ' + getCat(form.category).label
      )
      setForm(f=>({...f, aiSummary:text.trim()}))
    } catch { setForm(f=>({...f, aiSummary:'ไม่สามารถเชื่อม AI ได้'})) }
    setAiLoading(false)
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) set("tags",[...form.tags,t])
    setTagInput("")
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:12,marginBottom:14}}>
        <div><label style={labelStyle}>วันที่</label><input className="input" type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></div>
        <div><label style={labelStyle}>ชื่องาน *</label><input className="input" placeholder="เช่น ออกแบบโปสเตอร์..." value={form.title} onChange={e=>set("title",e.target.value)}/></div>
      </div>

      <div style={{marginBottom:14}}>
        <label style={labelStyle}>รายละเอียด</label>
        <textarea className="input textarea" placeholder="พิมพ์สั้นๆ แล้วให้ AI สรุปให้..." value={form.description} onChange={e=>set("description",e.target.value)}/>
        <button onClick={summarize} disabled={aiLoading||!form.description.trim()} style={{marginTop:8,padding:"7px 16px",background:aiLoading?"rgba(108,99,255,0.08)":"linear-gradient(135deg,#6C63FF,#9B8FFF)",color:aiLoading?"var(--text3)":"white",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:aiLoading?"default":"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>
          {aiLoading?"✨ กำลังสรุป...":"✨ ให้ AI สรุปให้"}
        </button>
        {form.aiSummary && (
          <div className="ai-box">
            <div className="ai-label">AI Summary</div>
            <div style={{fontSize:13,color:"var(--text)",lineHeight:1.7}}>{form.aiSummary}</div>
            <button onClick={()=>set("aiSummary","")} style={{fontSize:10,color:"var(--text3)",background:"none",border:"none",cursor:"pointer",marginTop:4}}>× ลบ</button>
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <div><label style={labelStyle}>หมวดหมู่</label>
          <select className="input" value={form.category} onChange={e=>set("category",e.target.value)}>
            {CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <div><label style={labelStyle}>สถานะ</label>
          <select className="input" value={form.status} onChange={e=>set("status",e.target.value)}>
            <option value="done">✅ เสร็จแล้ว</option>
            <option value="in_progress">🔄 กำลังทำ</option>
            <option value="draft">📝 ร่าง</option>
          </select>
        </div>
        <div><label style={labelStyle}>เวลา</label>
          <select className="input" value={form.hours} onChange={e=>set("hours",parseFloat(e.target.value))}>
            {HOURS_OPT.map(h=><option key={h} value={h}>{h} ชม.</option>)}
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>รูปภาพ / ไฟล์ {uploading && <span style={{color:"#6C63FF"}}>กำลังอัปโหลด...</span>}</label>
        <div
          className={"upload-zone" + (dragging?" drag":"")}
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);uploadToStorage(Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/")))}}
          onClick={()=>!uploading&&fileRef.current?.click()}
          style={{opacity:uploading?0.7:1,cursor:uploading?"default":"pointer"}}
        >
          <div style={{fontSize:26,marginBottom:6}}>{uploading?"⏳":"📎"}</div>
          <div style={{fontSize:13,color:"var(--text2)"}}>
            {uploading ? "กำลังอัปโหลดไปยัง Gallery..." : form.imageUrls?.length > 0 ? "✅ " + form.imageUrls.length + " ไฟล์ · คลิกเพิ่ม" : "ลากไฟล์มาวาง หรือคลิกเลือก"}
          </div>
          <div style={{fontSize:11,color:"var(--text3)",marginTop:3}}>JPG · PNG · MP4 · PDF — จะบันทึกไปยัง Gallery อัตโนมัติ</div>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{display:"none"}}
            onChange={e=>uploadToStorage(Array.from(e.target.files))}/>
        </div>

        {/* Preview thumbnails */}
        {form.imageUrls?.length > 0 && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
            {form.imageUrls.map((url,i) => (
              <div key={i} style={{position:"relative",width:64,height:64,borderRadius:10,overflow:"hidden",border:"1px solid rgba(200,210,240,0.5)"}}>
                <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <button
                  onClick={()=>set("imageUrls",form.imageUrls.filter((_,j)=>j!==i))}
                  style={{position:"absolute",top:2,right:2,width:18,height:18,borderRadius:"50%",background:"rgba(239,68,68,0.85)",border:"none",color:"white",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{marginBottom:14}}>
        <label style={labelStyle}>แท็ก</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {form.tags.map(t=>(
            <span key={t} className="tag-chip">#{t}<span onClick={()=>set("tags",form.tags.filter(x=>x!==t))} style={{cursor:"pointer",opacity:.6,marginLeft:2}}>×</span></span>
          ))}
          <input className="input" placeholder="เพิ่มแท็ก..." value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag()}}} style={{width:120,padding:"5px 10px"}}/>
          <button onClick={addTag} className="btn btn-ghost btn-sm">+ เพิ่ม</button>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:12,borderTop:"1px solid rgba(200,210,240,0.4)"}}>
        <button onClick={onCancel} className="btn btn-ghost">ยกเลิก</button>
        <button onClick={()=>form.title.trim()&&onSave(form)} className="btn btn-primary" style={{opacity:form.title.trim()?1:.5}}>บันทึก →</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// REPORT MODAL
// ─────────────────────────────────────────
function ReportModal({logs,onClose}){
  const [loading,setLoading]=useState(false)
  const [report,setReport]=useState(null)
  const stats=getStats(logs)
  const catData=Object.entries(stats.byCategory).map(([id,count])=>({label:getCat(id).label,value:count,color:getCat(id).color})).sort((a,b)=>b.value-a.value)

  async function generate(){
    setLoading(true)
    try{
      const list=logs.map(l=>`- ${l.title} (${getCat(l.category).label}, ${l.hours}ชม.)`).join("\n")
      const text=await callAI(`สรุปผลงานประจำเดือนภาษาไทยระดับมืออาชีพ:\nงาน ${stats.total} ชิ้น ${stats.hours} ชั่วโมง\n${list}\n\nกรุณาสร้าง: 1.บทสรุปผู้บริหาร 2.ผลงานเด่น 3 อันดับ 3.จุดแข็ง 4.ข้อเสนอแนะ`)
      setReport(text)
    }catch{setReport("ไม่สามารถสร้างรายงานได้")}
    setLoading(false)
  }

  return (
    <div className="modal-wrap" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>รายงานประจำเดือน</div><div style={{fontSize:12,color:"var(--text3)"}}>พฤษภาคม 2568</div></div>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"var(--text3)"}}>×</button>
        </div>
        <div className="g3" style={{marginBottom:16}}>
          {[{l:"งาน",v:stats.total,c:"#6C63FF"},{l:"ชั่วโมง",v:stats.hours,c:"#06B6D4"},{l:"หมวด",v:Object.keys(stats.byCategory).length,c:"#10B981"}].map(s=>(
            <div key={s.l} className="card" style={{textAlign:"center",padding:14}}>
              <div style={{fontSize:11,color:"var(--text3)"}}>{s.l}</div>
              <div style={{fontSize:24,fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{marginBottom:16}}>
          <div className="card-t">งานตามหมวดหมู่</div>
          {catData.map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{width:80,fontSize:11,color:"var(--text2)",textAlign:"right"}}>{d.label}</div>
              <div style={{flex:1,height:6,background:"rgba(0,0,0,0.06)",borderRadius:10,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(d.value/Math.max(...catData.map(x=>x.value),1))*100}%`,background:d.color,borderRadius:10,transition:"width .7s"}}/>
              </div>
              <div style={{width:20,fontSize:11,color:"var(--text3)"}}>{d.value}</div>
            </div>
          ))}
        </div>
        {!report&&!loading&&<button onClick={generate} className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:14,fontSize:14}}>✨ ให้ AI สร้างรายงานสรุปผลงาน</button>}
        {loading&&<div style={{textAlign:"center",padding:28,color:"var(--accent)"}}>✨ AI กำลังสร้างรายงาน...</div>}
        {report&&(
          <div className="ai-box">
            <div className="ai-label">AI Monthly Report</div>
            <div style={{fontSize:13,lineHeight:1.85,whiteSpace:"pre-wrap",color:"var(--text)"}}>{report}</div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>navigator.clipboard?.writeText(report)} className="btn btn-ghost btn-sm">📋 คัดลอก</button>
              <button onClick={() => downloadReportPDF(logs, report)} className="btn btn-primary btn-sm">📥 Download PDF</button>
              <button onClick={generate} className="btn btn-ghost btn-sm">🔄 สร้างใหม่</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────
function DashboardPage({logs,onAdd,onReport}){
  const stats=getStats(logs)
  const weeklyData=getWeeklyData(logs)
  const trendData=getTrendData(logs)
  const pieData=Object.entries(stats.byCategory).map(([id,value])=>({id,value,color:getCat(id).color}))
  const [aiInsight,setAiInsight]=useState("")
  const [aiLoading,setAiLoading]=useState(false)
  const hour=new Date().getHours()
  const greeting=hour<12?"Good Morning ☀️":hour<18?"Good Afternoon 🌤":"Good Evening 🌙"

  async function getInsight(){
    setAiLoading(true)
    const text=await callAI(`คุณเป็น AI Coach วิเคราะห์สั้นๆ 3 bullet points ภาษาไทย:\nงาน ${stats.total} ชิ้น ${stats.hours} ชม.\nหมวดหลัก: ${stats.topCat?.label||'ไม่มีข้อมูล'}\nอย่าใช้ markdown ขึ้นต้น • แต่ละข้อ`)
    setAiInsight(text)
    setAiLoading(false)
  }

  const kpis=[
    {label:"Total Tasks",     value:stats.total,          unit:"งาน",  color:"#6C63FF", bg:"rgba(108,99,255,0.08)",  border:"rgba(108,99,255,0.18)",  icon:"✦",  change:"+12%", up:true},
    {label:"Work Hours",      value:stats.hours,          unit:"ชม.",  color:"#06B6D4", bg:"rgba(6,182,212,0.08)",   border:"rgba(6,182,212,0.18)",   icon:"⏱",  change:"+5%",  up:true},
    {label:"Completion",      value:stats.completionRate, unit:"%",    color:"#10B981", bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.18)",  icon:"✅", change:"100%", up:true},
    {label:"Avg per Task",    value:stats.avgHours,       unit:"ชม.",  color:"#F59E0B", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.18)",  icon:"⚡", change:"-8%",  up:false},
  ]

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-orb" style={{width:280,height:280,top:-100,right:-60,background:"radial-gradient(circle,rgba(108,99,255,0.18),transparent)"}}/>
        <div className="hero-orb" style={{width:200,height:200,bottom:-60,left:160,background:"radial-gradient(circle,rgba(6,182,212,0.14),transparent)"}}/>
        <div style={{position:"relative",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:4}}>{greeting}</div>
            <div className="hero-title">สวัสดีครับ 👋</div>
            <div className="hero-sub">
              คุณบันทึก <strong style={{color:"var(--accent)"}}>{stats.total} งาน</strong> เดือนนี้ · รวม <strong style={{color:"var(--accent2)"}}>{stats.hours} ชั่วโมง</strong>
            </div>
            <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
              <div className="streak-pill">🔥 7 Day Streak</div>
              <div className="prod-pill">↑ +12% Productivity</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
            <button onClick={onReport} className="btn btn-ghost">✨ รายงาน AI</button>
            <button onClick={onAdd} className="btn btn-primary">+ เพิ่มงาน</button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        {kpis.map((k,i)=>(
          <div key={i} className="kpi" style={{background:k.bg,border:`1px solid ${k.border}`}}>
            <div className="kpi-icon-wrap" style={{background:`${k.color}18`}}>
              <span style={{fontSize:17}}>{k.icon}</span>
            </div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{color:k.color}}>
              <AnimatedNumber value={k.value}/>{k.unit}
            </div>
            <div className="kpi-change" style={{color:k.up?"#059669":"#DC2626"}}>
              {k.up?"↑":"↓"} {k.change} vs เดือนที่แล้ว
            </div>
            <div className="kpi-bar" style={{background:`linear-gradient(90deg,${k.color}60,transparent)`}}/>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="g2">
        <div className="card">
          <div className="card-t">ชั่วโมงทำงาน 7 วันล่าสุด</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{top:4,right:4,bottom:0,left:-20}}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"rgba(255,255,255,0.95)",border:"1px solid rgba(200,210,240,0.6)",borderRadius:10,fontSize:12,boxShadow:"0 4px 20px rgba(100,110,200,0.15)"}} labelStyle={{color:"var(--text2)"}}/>
                <Area type="monotone" dataKey="hours" stroke="#6C63FF" fill="url(#grad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-t">งานรายสัปดาห์</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{top:4,right:4,bottom:0,left:-20}}>
                <XAxis dataKey="name" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"rgba(255,255,255,0.95)",border:"1px solid rgba(200,210,240,0.6)",borderRadius:10,fontSize:12,boxShadow:"0 4px 20px rgba(100,110,200,0.15)"}}/>
                <Bar dataKey="hours" fill="#06B6D4" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap + Timeline */}
      <div className="g2">
        <div className="card">
          <div className="section-header"><div className="section-title">Calendar Activity</div></div>
          <SmartProductivityPanel logs={logs} onReport={onReport} />
        </div>
        <div className="card">
          <div className="section-header"><div className="section-title">Activity Timeline</div><span className="section-sub">งานล่าสุด</span></div>
          <ActivityTimeline logs={logs}/>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card" style={{marginBottom:16,background:"linear-gradient(135deg,rgba(108,99,255,0.05),rgba(6,182,212,0.03))",border:"1px solid rgba(108,99,255,0.12)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--accent)",letterSpacing:1,textTransform:"uppercase"}}>AI Insights</div>
            <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginTop:2}}>วิเคราะห์ผลการทำงาน</div>
          </div>
          <button onClick={getInsight} disabled={aiLoading} className="btn btn-primary btn-sm">
            {aiLoading?"⏳ กำลังวิเคราะห์...":"🧠 วิเคราะห์ AI"}
          </button>
        </div>
        {aiInsight?(
          <div style={{fontSize:13,lineHeight:1.85,color:"var(--text)",whiteSpace:"pre-wrap"}}>{aiInsight}</div>
        ):(
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {[
              {icon:"🎯",label:"Completion",value:`${stats.completionRate}%`,color:"#10B981"},
              {icon:"⏰",label:"Top Category",value:stats.topCat?.label||"—",color:"#6C63FF"},
              {icon:"📈",label:"Avg/Task",value:`${stats.avgHours} ชม.`,color:"#06B6D4"},
            ].map((s,i)=>(
              <div key={i} style={{flex:1,minWidth:120,background:"rgba(255,255,255,0.5)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.8)"}}>
                <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{s.label}</div>
                <div style={{fontSize:15,fontWeight:700,color:s.color,marginTop:2}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent + Pie */}
      <div className="g3-1">
        <div className="card">
          <div className="section-header">
            <div className="section-title">งานล่าสุด</div>
            <button onClick={onReport} className="btn btn-ghost btn-sm">✨ สร้างรายงาน</button>
          </div>
          {logs.slice(0,5).map(log=>{
            const cat=getCat(log.category)
            return (
              <div key={log.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
                <div style={{width:28,height:28,borderRadius:8,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{log.title}</div>
                  <div style={{fontSize:11,color:"var(--text3)"}}>{fmtDate(log.date)} · {log.hours} ชม.</div>
                </div>
                <Badge category={log.category}/>
              </div>
            )
          })}
        </div>
        <div className="card">
          <div className="card-t">สัดส่วนหมวดหมู่</div>
          <div style={{display:"flex",justifyContent:"center"}}>
            <PieChart width={180} height={150}>
              <Pie data={pieData} cx={85} cy={70} innerRadius={36} outerRadius={60} dataKey="value" paddingAngle={3}>
                {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={{background:"rgba(255,255,255,0.95)",border:"1px solid rgba(200,210,240,0.5)",borderRadius:8,fontSize:12}}/>
            </PieChart>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:4}}>
            {pieData.slice(0,4).map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                <div style={{flex:1,fontSize:11,color:"var(--text2)"}}>{getCat(d.id).label}</div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// LOGS PAGE
// ─────────────────────────────────────────
function LogsPage({logs,onEdit,onDelete,onAdd}){
  const [filter,setFilter]=useState("all")
  const filtered=filter==="all"?logs:logs.filter(l=>l.category===filter)
  const groups={}
  filtered.forEach(l=>{ if(!groups[l.date])groups[l.date]=[]; groups[l.date].push(l) })
  const sorted=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]))

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div><div style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>รายการงาน</div><div style={{fontSize:12,color:"var(--text3)"}}>ทั้งหมด {logs.length} งาน</div></div>
        <button onClick={onAdd} className="btn btn-primary">+ เพิ่มงาน</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
        <button className={`pill ${filter==="all"?"on":""}`} onClick={()=>setFilter("all")}>ทั้งหมด ({logs.length})</button>
        {CATS.map(c=><button key={c.id} className={`pill ${filter===c.id?"on":""}`} onClick={()=>setFilter(c.id)}>{c.icon} {c.label}</button>)}
      </div>
      {sorted.length===0?<div className="empty"><div className="empty-icon">📋</div><div>ยังไม่มีงาน</div></div>:
        sorted.map(([date,dayLogs])=>(
          <div key={date} style={{marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text3)",marginBottom:8,letterSpacing:.5}}>
              {fmtDate(date).toUpperCase()} · {dayLogs.length} งาน · {dayLogs.reduce((s,l)=>s+l.hours,0)} ชม.
            </div>
            {dayLogs.map(log=>{
              const [exp,setExp]=useState(false)
              const cat=getCat(log.category)
              return (
                <div key={log.id} className="log-card" onClick={()=>setExp(!exp)}>
                  <div className="log-acc" style={{background:cat.color}}/>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,paddingLeft:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:600,fontSize:14,color:"var(--text)"}}>{log.title}</span>
                        <Badge category={log.category}/>
                      </div>
                      <div style={{fontSize:12,color:"var(--text2)",marginTop:4,lineHeight:1.5}}>{log.aiSummary||log.description}</div>
                      {log.tags?.length>0&&<div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>{log.tags.map(t=><span key={t} className="tag-chip" style={{fontSize:10}}>#{t}</span>)}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11,color:"var(--text3)"}}>{fmtDate(log.date)}</div>
                      <div style={{fontSize:12,color:cat.color,fontWeight:600,marginTop:2}}>{log.hours} ชม.</div>
                    </div>
                  </div>
                  {exp&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(0,0,0,0.06)",display:"flex",gap:8,justifyContent:"flex-end",paddingLeft:8}}>
                    <button onClick={e=>{e.stopPropagation();onEdit(log)}} className="btn btn-ghost btn-sm">แก้ไข</button>
                    <button onClick={e=>{e.stopPropagation();onDelete(log.id)}} className="btn btn-danger btn-sm">ลบ</button>
                  </div>}
                </div>
              )
            })}
          </div>
        ))
      }
    </div>
  )
}

// ─────────────────────────────────────────
// COMING SOON
// ─────────────────────────────────────────
function ComingSoonPage({icon,title,desc,features=[]}){
  return (
    <div className="coming-soon">
      <div className="cs-card">
        <div style={{fontSize:48,marginBottom:16}}>{icon}</div>
        <div style={{fontSize:20,fontWeight:700,color:"var(--text)",marginBottom:8}}>{title}</div>
        <div style={{fontSize:14,color:"var(--text2)",lineHeight:1.7,marginBottom:20}}>{desc}</div>
        {features.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
            {features.map((f,i)=>(
              <span key={i} style={{background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.15)",color:"var(--accent)",fontSize:12,fontWeight:500,padding:"4px 12px",borderRadius:20}}>{f}</span>
            ))}
          </div>
        )}
        <div style={{marginTop:20,fontSize:12,color:"var(--text3)"}}>🚧 กำลังพัฒนา — Phase ถัดไป</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// PORTFOLIO
// ─────────────────────────────────────────
function PortfolioPage({logs}){
  const stats=getStats(logs)
  const catData=Object.entries(stats.byCategory).map(([id,count])=>({cat:getCat(id),count}))
  return (
    <div style={{maxWidth:700}}>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Portfolio</div><div style={{fontSize:12,color:"var(--text3)"}}>สรุปผลงานประจำเดือน</div></div>
      <div style={{background:"linear-gradient(135deg,rgba(108,99,255,0.08),rgba(6,182,212,0.05))",border:"1px solid rgba(255,255,255,0.9)",borderRadius:"var(--r-xl)",padding:32,textAlign:"center",marginBottom:20,backdropFilter:"var(--blur)"}}>
        <div style={{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,#6C63FF,#A78BFA)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px",boxShadow:"0 4px 20px rgba(108,99,255,0.3)"}}>🎨</div>
        <div style={{fontSize:22,fontWeight:700,color:"var(--text)",letterSpacing:-.4}}>Work Portfolio</div>
        <div style={{fontSize:13,color:"var(--text2)",marginTop:4}}>พฤษภาคม 2568 · {stats.total} ผลงาน · {stats.hours} ชั่วโมง</div>
      </div>
      <div className="g3">
        {[{icon:"✦",l:"ผลงาน",v:stats.total,c:"#6C63FF"},{icon:"⏱",l:"ชั่วโมง",v:stats.hours,c:"#06B6D4"},{icon:"◈",l:"หมวดหมู่",v:Object.keys(stats.byCategory).length,c:"#10B981"}].map(s=>(
          <div key={s.l} className="card" style={{textAlign:"center",padding:16}}>
            <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"var(--text3)"}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-t">ทักษะ</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {catData.map(({cat,count})=>(
            <div key={cat.id} style={{background:cat.bg,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,border:`1px solid ${cat.color}20`}}>
              <div style={{width:34,height:34,borderRadius:10,background:`${cat.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.icon}</div>
              <div><div style={{fontSize:13,fontWeight:600,color:cat.color}}>{cat.label}</div><div style={{fontSize:11,color:"var(--text3)"}}>{count} งาน</div></div>
              <div style={{marginLeft:"auto",fontSize:18,fontWeight:700,color:cat.color}}>{count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-t">Work Timeline</div>
        {logs.map((log,i)=>{
          const cat=getCat(log.category)
          return (
            <div key={log.id} style={{display:"flex",gap:0,position:"relative"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:36,flexShrink:0}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:cat.bg,border:`2px solid ${cat.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,zIndex:1,marginTop:8}}>{cat.icon}</div>
                {i<logs.length-1&&<div style={{width:1.5,flex:1,background:"rgba(108,99,255,0.15)",minHeight:18}}/>}
              </div>
              <div style={{flex:1,paddingBottom:12,paddingLeft:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{log.title}</span>
                  <Badge category={log.category}/>
                </div>
                <div style={{fontSize:11,color:"var(--text3)"}}>{fmtDate(log.date)} · {log.hours} ชม.</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("dashboard")
  const [logs,setLogs]=useState([])
  const [showForm,setShowForm]=useState(false)
  const [editLog,setEditLog]=useState(null)
  const [showReport,setShowReport]=useState(false)
  const [showCmd,setShowCmd]=useState(false)
  const [toast,setToast]=useState(null)

  useEffect(()=>{
    async function load(){
      const{data,error}=await supabase.from('work_logs').select('*').order('date',{ascending:false})
      if(error||!data?.length){setLogs(SAMPLE);return}
      setLogs(data.map(d=>({id:d.id,date:d.date,title:d.title,description:d.description,aiSummary:d.ai_summary,category:d.category,hours:d.hours_spent,status:d.status,tags:d.tags||[],imageUrls:d.image_urls||[]})))
    }
    load()
  },[])

  useEffect(()=>{
    function onKey(e){ if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setShowCmd(s=>!s)} }
    window.addEventListener("keydown",onKey)
    return()=>window.removeEventListener("keydown",onKey)
  },[])

  const showT=msg=>{ setToast(msg); setTimeout(()=>setToast(null),3000) }

  async function handleSave(form) {
  // Upload images to Supabase Storage ถ้ายังไม่ได้ upload
  let finalImageUrls = form.imageUrls || []

  const d = {
    title:       form.title,
    description: form.description || '',
    ai_summary:  form.aiSummary || '',
    category:    form.category,
    hours_spent: form.hours,
    status:      form.status,
    tags:        form.tags || [],
    date:        form.date,
    image_urls:  finalImageUrls,   // ← save URL ลง DB
  }

  if (editLog) {
    await supabase.from('work_logs').update(d).eq('id', editLog.id)
    setLogs(ls => ls.map(l => l.id === editLog.id
      ? { ...l, ...form, imageUrls: finalImageUrls }
      : l
    ))
    showT('✓ แก้ไขงานแล้ว')
  } else {
    const { data } = await supabase.from('work_logs').insert(d).select()
    if (data?.[0]) {
      setLogs(ls => [{ ...form, id: data[0].id, imageUrls: finalImageUrls }, ...ls])
    }
    showT('✓ บันทึกงานแล้ว')
  }
  setShowForm(false); setEditLog(null); setPage('logs')
}
  async function handleDelete(id) {
  await supabase.from('work_logs').delete().eq('id', id)
  setLogs(ls => ls.filter(l => l.id !== id))
  showT('ลบงานแล้ว')
}

  // Sidebar nav structure
  const mainNav=[
    {id:"dashboard",     icon:"▦",  label:"Dashboard"},
    {id:"log",           icon:"➕", label:"เพิ่มงาน"},
    {id:"logs",          icon:"≡",  label:"รายการงาน",  badge:logs.length},
    {id:"projects",      icon:"📁", label:"Projects"},
    {id:"calendar",      icon:"📅", label:"Calendar"},
    {id:"reports",       icon:"📊", label:"Reports"},
    {id:"ai-assistant",  icon:"🤖", label:"AI Assistant"},
    {id:"export",        icon:"📥", label:"Export Center"},
    {id:"presentation",  icon:"🎬", label:"Presentation Studio"},
    {id:"gallery",       icon:"🖼", label:"Gallery"},
    {id:"portfolio",     icon:"◈",  label:"Portfolio"},
  ]

  const quickActions=[
    {id:"report",       icon:"✨", label:"Generate Report",   action:()=>setShowReport(true)},
    {id:"export-pdf",   icon:"📥", label:"Export PDF",         action:()=>showT("📥 Export — Phase E")},
    {id:"slides",       icon:"🎬", label:"Create Slides",       action:()=>setPage("presentation")},
    {id:"ai-sum",       icon:"🧠", label:"AI Summary",          action:()=>setPage("ai-assistant")},
    {id:"add",          icon:"➕", label:"Add Task",             action:()=>{setEditLog(null);setShowForm(true);setPage("log")}},
  ]

  // Page title
  const pageTitle = mainNav.find(n=>n.id===page)?.label||"Dashboard"

  // Render page content
  function renderPage(){
    if (showForm || page === "log") {
  return (
    <SmartWorklogWorkspace
      initial={editLog}
      onSave={handleSave}
      onUploadFiles={async (files, category, onProgress) => {
  const urls = []
  for (let i = 0; i < files.length; i++) {
    try {
      const file = files[i]
      const path = (category || 'other') + '/' + Date.now() + '_' +
        file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

      const { error } = await supabase.storage
        .from('worklog-gallery')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (!error) {
        const { data } = supabase.storage
          .from('worklog-gallery')
          .getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    } catch {}
    onProgress(Math.round(((i + 1) / files.length) * 100))
  }
  return urls
}}
      onCancel={() => {
        setShowForm(false)
        setEditLog(null)
        setPage("dashboard")
      }}
    />
  )
}
    switch(page){
      case "dashboard":   return <DashboardPage logs={logs} onAdd={()=>{setEditLog(null);setShowForm(true);setPage("log")}} onReport={()=>setShowReport(true)}/>
      case "logs":        return <LogsPage logs={logs} onEdit={log=>{setEditLog(log);setShowForm(true);setPage("log")}} onDelete={handleDelete} onAdd={()=>{setEditLog(null);setShowForm(true);setPage("log")}}/>
      case "gallery":
  return <GalleryPageFull logs={logs} />
      case "portfolio":   return <PortfolioPage logs={logs}/>
      case "projects":    return <ComingSoonPage icon="📁" title="Projects" desc="จัดการโปรเจกต์ทั้งหมดในที่เดียว แบ่งงานตาม client หรือ project ได้" features={["Project Board","Client Management","Deadline Tracking","Team Assignment"]}/>
      case "calendar":
  return (
    <CalendarPage
      logs={logs}
      onAddLog={data => {
        setEditLog({ ...data, title: data.title || '' })
        setShowForm(true)
        setPage("log")
      }}
      onEditLog={log => {
        setEditLog({ ...log, title: log.title || '' })
        setShowForm(true)
        setPage("log")
      }}
      onDeleteLog={async id => {
        await supabase.from('work_logs').delete().eq('id', id)
        setLogs(ls => ls.filter(l => l.id !== id))
        showT('ลบงานแล้ว')
      }}
    />
  )
      case "reports":     return <ComingSoonPage icon="📊" title="Reports" desc="รายงานสรุปผลงานรายเดือนและรายปี พร้อม AI วิเคราะห์เชิงลึก" features={["Monthly Report","Yearly Summary","KPI Analysis","AI Insights"]}/>
      case "ai-assistant":
  return (
    <AIAssistantPage
      logs={logs}
      onLogCreated={async (data) => {
        const d = {
          title: data.title, description: data.description,
          ai_summary: data.aiSummary || '',
          category: data.category, hours_spent: data.hours,
          status: data.status, tags: data.tags, date: data.date,
        }
        const { data: saved } = await supabase.from('work_logs').insert(d).select()
        if (saved?.[0]) setLogs(ls => [{ ...data, id: saved[0].id }, ...ls])
        showT('✓ บันทึกงานจาก AI แล้ว')
      }}
    />
  )
      case "export":
  return (
    <div style={{maxWidth:600}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Export Center</div>
        <div style={{fontSize:12,color:"var(--text3)"}}>ดาวน์โหลดรายงานในรูปแบบต่างๆ</div>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:4}}>📄 PDF Report</div>
            <div style={{fontSize:12,color:"var(--text3)"}}>รายงาน 3 หน้า — Cover + Work List + AI Analysis</div>
          </div>
          <button
            onClick={()=>downloadReportPDF(logs, "")}
            className="btn btn-primary"
          >
            📥 Download PDF
          </button>
        </div>
      </div>
    </div>
  )
     case "presentation":
  return <PresentationStudio logs={logs} />
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Sidebar */}
        <div className="sb">
          {/* Logo */}
          <div className="sb-logo">
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div className="logo-mark">✦</div>
              <div><div className="logo-name">WorkLog AI</div><div className="logo-sub">SaaS Platform</div></div>
            </div>
          </div>

          {/* Search */}
          <button className="sb-search" onClick={()=>setShowCmd(true)}>
            <span style={{fontSize:13}}>🔍</span>
            <span style={{flex:1}}>ค้นหาคำสั่ง...</span>
            <kbd>⌘K</kbd>
          </button>

          {/* Main Menu */}
          <div className="sb-section">Main Menu</div>
          {mainNav.map(item=>(
            <button key={item.id} className={`nav ${page===item.id&&!showForm?"on":item.id==="log"&&showForm?"on":""}`}
              onClick={()=>{ setPage(item.id); if(item.id!=="log")setShowForm(false); else{setEditLog(null);setShowForm(true)}; setEditLog(null) }}>
              <div className="nav-icon">{item.icon}</div>
              {item.label}
              {item.badge>0&&<span className="nav-badge">{item.badge}</span>}
            </button>
          ))}

          {/* Quick Actions */}
          <div className="sb-section">Quick Actions</div>
          {quickActions.map(item=>(
            <button key={item.id} className="nav" onClick={item.action}>
              <div className="nav-icon">{item.icon}</div>
              {item.label}
            </button>
          ))}

          {/* Upgrade + User */}
          <div className="sb-upgrade">
            <div className="upgrade-badge">PRO</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--accent)",marginBottom:2}}>Unlimited AI</div>
            <div style={{fontSize:11,color:"var(--text3)"}}>PDF · PPT · Portfolio</div>
          </div>
          <div className="sb-foot">
            <div className="sb-user">
              <div className="sb-avatar">W</div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>WorkLog User</div>
                <div style={{fontSize:10,color:"var(--text3)"}}>Pro Plan · Active</div>
              </div>
              <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login'}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--text3)",padding:"4px",borderRadius:6}} title="ออกจากระบบ">↩</button>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="breadcrumb">WorkLog</span>
              <span style={{color:"var(--text3)",fontSize:13}}>/</span>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{showForm?(editLog?"แก้ไขงาน":"เพิ่มงาน"):pageTitle}</span>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowCmd(true)}>⌘ Command</button>
              <button onClick={()=>{setEditLog(null);setShowForm(true);setPage("log")}} className="btn btn-primary btn-sm">+ เพิ่มงาน</button>
            </div>
          </div>
          <div className="content">{renderPage()}</div>
        </div>

        {showReport&&<ReportModal logs={logs} onClose={()=>setShowReport(false)}/>}
        {showCmd&&<CommandPalette onClose={()=>setShowCmd(false)} onAction={handleCmdAction}/>}
        {toast&&<div className="toast"><span>✦</span>{toast}</div>}
      </div>
    </>
  )
}
