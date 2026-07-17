import { save as dialogSave, open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { writeTextFile, writeFile, readTextFile } from '@tauri-apps/plugin-fs'
import { EMPTY_MIND_MAP } from './storage'
import type { MindMapData, MindEndpoint } from './storage'
import { catmullRomSegments, segmentsToSvgPath, drawSegmentsOnCanvas, type Pt } from './mindmapCurve'

export type MindExportFormat = 'png' | 'svg' | 'foliomap'
export interface ExportResult { ok: boolean; reason?: 'empty' | 'cancelled' | 'error'; path?: string }
export type ImportResult = { ok: true; data: MindMapData } | { ok: false; reason: 'cancelled' | 'error' }

const PAD = 48
const HEADER_H = 23          // bubble header strip
const TEXT_PAD_X = 10
const TEXT_PAD_TOP = 8
const LINE_H = 1.45
const NODE_FALLBACK_H = 80

interface Theme { bg: string; edge: string; accent: string }

// Read the live theme colours so the export matches what's on screen.
function readTheme(): Theme {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback
  return { bg: v('--bg', '#1a1814'), edge: v('--text3', '#6b6058'), accent: v('--accent', '#c4a882') }
}

function bounds(data: MindMapData, heights: Record<string, number>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of data.nodes) {
    const h = heights[n.id] ?? NODE_FALLBACK_H
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + h)
  }
  for (const im of data.images) {
    minX = Math.min(minX, im.x); minY = Math.min(minY, im.y)
    maxX = Math.max(maxX, im.x + im.width); maxY = Math.max(maxY, im.y + im.height)
  }
  for (const e of data.edges) {
    for (const p of e.points ?? []) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
    }
  }
  if (!isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

function endpoint(data: MindMapData, heights: Record<string, number>, ep: MindEndpoint): { x: number; y: number } | null {
  if (ep.kind === 'node') {
    const n = data.nodes.find(n => n.id === ep.id)
    if (!n) return null
    return { x: n.x + n.width / 2, y: n.y + (heights[n.id] ?? NODE_FALLBACK_H) / 2 }
  }
  const im = data.images.find(i => i.id === ep.id)
  if (!im) return null
  return { x: im.x + (ep.ax ?? 0.5) * im.width, y: im.y + (ep.ay ?? 0.5) * im.height }
}

// Greedy word-wrap to a pixel width using a measuring 2D context.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of (text || '').split('\n')) {
    if (para === '') { out.push(''); continue }
    let line = ''
    for (const word of para.split(/(\s+)/)) {
      const test = line + word
      if (ctx.measureText(test).width > maxWidth && line !== '') { out.push(line.trimEnd()); line = word.trimStart() }
      else line = test
    }
    out.push(line.trimEnd())
  }
  return out
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ─── PNG ───────────────────────────────────────────────────────────────────
export async function mindMapToPngBytes(data: MindMapData, heights: Record<string, number>): Promise<Uint8Array> {
  const b = bounds(data, heights)!
  const theme = readTheme()
  const scale = 2
  const w = b.maxX - b.minX + PAD * 2
  const h = b.maxY - b.minY + PAD * 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, w, h)
  ctx.translate(-b.minX + PAD, -b.minY + PAD)

  // images first
  const imgEls = await Promise.all(data.images.map(im => loadImage(im.src).catch(() => null)))
  data.images.forEach((im, i) => { const el = imgEls[i]; if (el) ctx.drawImage(el, im.x, im.y, im.width, im.height) })

  // edges (above images, below bubbles)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (const e of data.edges) {
    const a = endpoint(data, heights, e.from), c = endpoint(data, heights, e.to)
    if (!a || !c) continue
    const pts: Pt[] = [a, ...(e.points ?? []), c]
    ctx.strokeStyle = e.color || theme.edge
    ctx.beginPath(); drawSegmentsOnCanvas(ctx, pts[0], catmullRomSegments(pts)); ctx.stroke()
    ctx.fillStyle = theme.accent
    if (e.to.kind === 'image') { ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill() }
    if (e.from.kind === 'image') { ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI * 2); ctx.fill() }
  }

  // bubbles on top
  for (const n of data.nodes) {
    const nh = heights[n.id] ?? NODE_FALLBACK_H
    ctx.save()
    if (n.rotation) {
      const cx = n.x + n.width / 2, cy = n.y + nh / 2
      ctx.translate(cx, cy); ctx.rotate(n.rotation * Math.PI / 180); ctx.translate(-cx, -cy)
    }
    roundRectPath(ctx, n.x, n.y, n.width, nh, 8)
    ctx.fillStyle = n.color
    ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4
    ctx.fill()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    // header strip
    ctx.save(); roundRectPath(ctx, n.x, n.y, n.width, nh, 8); ctx.clip()
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(n.x, n.y, n.width, HEADER_H)
    ctx.restore()
    // text
    ctx.fillStyle = '#2a2520'
    ctx.font = `${n.fontSize}px "Crimson Pro", Georgia, serif`
    ctx.textBaseline = 'alphabetic'
    const lines = wrap(ctx, n.text, n.width - TEXT_PAD_X * 2)
    let ty = n.y + HEADER_H + TEXT_PAD_TOP + n.fontSize
    for (const ln of lines) { ctx.fillText(ln, n.x + TEXT_PAD_X, ty); ty += n.fontSize * LINE_H }
    ctx.restore()
  }

  const dataUrl = canvas.toDataURL('image/png')
  const b64 = dataUrl.split(',')[1]
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ─── SVG ───────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function mindMapToSvg(data: MindMapData, heights: Record<string, number>): string {
  const b = bounds(data, heights)!
  const theme = readTheme()
  const w = b.maxX - b.minX + PAD * 2
  const h = b.maxY - b.minY + PAD * 2
  const ox = -b.minX + PAD, oy = -b.minY + PAD
  const measure = document.createElement('canvas').getContext('2d')!

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(h)}" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}">`)
  parts.push(`<rect width="100%" height="100%" fill="${theme.bg}"/>`)
  parts.push(`<g transform="translate(${ox} ${oy})">`)

  // images
  for (const im of data.images) {
    parts.push(`<image href="${im.src}" x="${im.x}" y="${im.y}" width="${im.width}" height="${im.height}" preserveAspectRatio="none"/>`)
  }
  // edges + anchor dots
  for (const e of data.edges) {
    const a = endpoint(data, heights, e.from), c = endpoint(data, heights, e.to)
    if (!a || !c) continue
    const pts: Pt[] = [a, ...(e.points ?? []), c]
    const d = segmentsToSvgPath(pts[0], catmullRomSegments(pts))
    parts.push(`<path d="${d}" fill="none" stroke="${e.color || theme.edge}" stroke-width="2" stroke-linecap="round"/>`)
    if (e.to.kind === 'image') parts.push(`<circle cx="${c.x}" cy="${c.y}" r="4" fill="${theme.accent}"/>`)
    if (e.from.kind === 'image') parts.push(`<circle cx="${a.x}" cy="${a.y}" r="4" fill="${theme.accent}"/>`)
  }
  // bubbles
  for (const n of data.nodes) {
    const nh = heights[n.id] ?? NODE_FALLBACK_H
    const cx = n.x + n.width / 2, cy = n.y + nh / 2
    parts.push(`<g${n.rotation ? ` transform="rotate(${n.rotation} ${cx} ${cy})"` : ''}>`)
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${nh}" rx="8" fill="${n.color}"/>`)
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${HEADER_H}" rx="8" fill="rgba(0,0,0,0.06)"/>`)
    parts.push(`<rect x="${n.x}" y="${n.y + 8}" width="${n.width}" height="${HEADER_H - 8}" fill="rgba(0,0,0,0.06)"/>`)
    measure.font = `${n.fontSize}px "Crimson Pro", Georgia, serif`
    const lines = wrap(measure, n.text, n.width - TEXT_PAD_X * 2)
    const x = n.x + TEXT_PAD_X
    let ty = n.y + HEADER_H + TEXT_PAD_TOP + n.fontSize
    parts.push(`<text font-family="'Crimson Pro', Georgia, serif" font-size="${n.fontSize}" fill="#2a2520">`)
    for (const ln of lines) { parts.push(`<tspan x="${x}" y="${ty}">${esc(ln) || ' '}</tspan>`); ty += n.fontSize * LINE_H }
    parts.push(`</text></g>`)
  }
  parts.push(`</g></svg>`)
  return parts.join('\n')
}

// ─── Save dispatcher ─────────────────────────────────────────────────────────
const FILTERS: Record<MindExportFormat, { name: string; extensions: string[] }> = {
  png:      { name: 'PNG Image',  extensions: ['png'] },
  svg:      { name: 'SVG Vector', extensions: ['svg'] },
  foliomap: { name: 'Foliomap',   extensions: ['foliomap'] },
}

export async function exportMindMap(
  format: MindExportFormat,
  data: MindMapData,
  heights: Record<string, number>,
): Promise<ExportResult> {
  if (data.nodes.length === 0 && data.images.length === 0) return { ok: false, reason: 'empty' }
  try {
    const path = await dialogSave({ filters: [FILTERS[format]], defaultPath: `mindmap.${FILTERS[format].extensions[0]}` })
    if (!path) return { ok: false, reason: 'cancelled' }
    if (format === 'png') {
      await writeFile(path, await mindMapToPngBytes(data, heights))
    } else if (format === 'svg') {
      await writeTextFile(path, mindMapToSvg(data, heights))
    } else {
      await writeTextFile(path, JSON.stringify(data, null, 2))
    }
    return { ok: true, path }
  } catch (e) {
    console.error('Mind map export failed:', e)
    return { ok: false, reason: 'error' }
  }
}

// Open a previously saved .foliomap (or raw .json) back into the canvas.
export async function importMindMap(): Promise<ImportResult> {
  try {
    const selected = await dialogOpen({
      filters: [{ name: 'Foliomap', extensions: ['foliomap', 'json'] }],
      multiple: false,
    })
    if (!selected) return { ok: false, reason: 'cancelled' }
    const path = Array.isArray(selected) ? selected[0] : selected
    const parsed = JSON.parse(await readTextFile(path))
    if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: 'error' }
    const data: MindMapData = {
      ...EMPTY_MIND_MAP,
      nodes:  Array.isArray(parsed.nodes)  ? parsed.nodes  : [],
      edges:  Array.isArray(parsed.edges)  ? parsed.edges  : [],
      images: Array.isArray(parsed.images) ? parsed.images : [],
    }
    return { ok: true, data }
  } catch (e) {
    console.error('Mind map import failed:', e)
    return { ok: false, reason: 'error' }
  }
}
