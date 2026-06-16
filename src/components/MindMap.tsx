import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import type { MindMapData, MindNode, MindImage, MindEdge, MindEndpoint } from '../lib/storage'
import { exportMindMap, importMindMap, type MindExportFormat } from '../lib/mindmapExport'

const COLORS = ['#f5e6a3', '#f0b8b8', '#b8e0b8', '#b8d0e8', '#d0b8e8', '#fcd5a0', '#ffffff']
const DEFAULT_NODE_W = 180
const NODE_FALLBACK_H = 80   // used until a bubble's real height is measured

// One pointer interaction at a time. Stored in a ref so the global mouse
// handlers always read the live value.
type Drag =
  | { mode: 'node';   id: string; startSX: number; startSY: number; origX: number; origY: number; moved: boolean }
  | { mode: 'image';  id: string; startSX: number; startSY: number; origX: number; origY: number; moved: boolean }
  | { mode: 'resize'; id: string; startSX: number; origW: number; ratio: number }
  | { mode: 'pan';    startSX: number; startSY: number; origPanX: number; origPanY: number }
  | { mode: 'connect'; fromId: string }

interface Props {
  data: MindMapData
  onChange: (data: MindMapData) => void
  onClose: () => void
}

let idCounter = 0
const newId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export default function MindMap({ data, onChange, onClose }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // Live preview point (world coords) while dragging out a new connection.
  const [connectPos, setConnectPos] = useState<{ x: number; y: number } | null>(null)
  // Measured bubble heights (text makes them grow); keyed by node id.
  const [heights, setHeights] = useState<Record<string, number>>({})

  // Refs mirror state so document-level listeners avoid stale closures.
  const dataRef = useRef(data);     useEffect(() => { dataRef.current = data }, [data])
  const onChangeRef = useRef(onChange); useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const scaleRef = useRef(scale);   useEffect(() => { scaleRef.current = scale }, [scale])
  const panRef = useRef(pan);       useEffect(() => { panRef.current = pan }, [pan])
  const heightsRef = useRef(heights); useEffect(() => { heightsRef.current = heights }, [heights])
  const dragRef = useRef<Drag | null>(null)

  const patch = useCallback((p: Partial<MindMapData>) => {
    onChangeRef.current({ ...dataRef.current, ...p })
  }, [])

  // Screen (client) coordinates → world coordinates.
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const s = scaleRef.current, p = panRef.current
    const ox = rect?.left ?? 0, oy = rect?.top ?? 0
    return { x: (clientX - ox - p.x) / s, y: (clientY - oy - p.y) / s }
  }, [])

  const nodeHeight = useCallback((id: string) => heightsRef.current[id] ?? NODE_FALLBACK_H, [])

  // World position of an edge endpoint: a bubble's centre, or a point on an
  // image. Reads the live `data`/`heights` from render scope so connection
  // lines stay glued to bubbles during a drag (no one-frame lag).
  const endpointPos = (ep: MindEndpoint): { x: number; y: number } | null => {
    if (ep.kind === 'node') {
      const n = data.nodes.find(n => n.id === ep.id)
      if (!n) return null
      return { x: n.x + n.width / 2, y: n.y + (heights[n.id] ?? NODE_FALLBACK_H) / 2 }
    }
    const img = data.images.find(i => i.id === ep.id)
    if (!img) return null
    return { x: img.x + (ep.ax ?? 0.5) * img.width, y: img.y + (ep.ay ?? 0.5) * img.height }
  }

  // ─── Global mouse move / up: drives every drag mode ────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const s = scaleRef.current
      if (d.mode === 'pan') {
        setPan({ x: d.origPanX + (e.clientX - d.startSX), y: d.origPanY + (e.clientY - d.startSY) })
      } else if (d.mode === 'node' || d.mode === 'image') {
        const dx = (e.clientX - d.startSX) / s
        const dy = (e.clientY - d.startSY) / s
        if (!d.moved && Math.abs(e.clientX - d.startSX) + Math.abs(e.clientY - d.startSY) > 2) d.moved = true
        const key = d.mode === 'node' ? 'nodes' : 'images'
        const list = (dataRef.current[key] as (MindNode | MindImage)[]).map(it =>
          it.id === d.id ? { ...it, x: d.origX + dx, y: d.origY + dy } : it
        )
        patch({ [key]: list } as Partial<MindMapData>)
      } else if (d.mode === 'resize') {
        const newW = Math.max(60, d.origW + (e.clientX - d.startSX) / s)
        patch({ images: dataRef.current.images.map(im =>
          im.id === d.id ? { ...im, width: newW, height: newW * d.ratio } : im) })
      } else if (d.mode === 'connect') {
        setConnectPos(toWorld(e.clientX, e.clientY))
      }
    }

    const onUp = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) { return }
      if (d.mode === 'connect') {
        const targetEl = (e.target as HTMLElement)
        const nodeEl = targetEl.closest('[data-mind-node]') as HTMLElement | null
        const imgEl = targetEl.closest('[data-mind-image]') as HTMLElement | null
        let to: MindEndpoint | null = null
        if (nodeEl && nodeEl.dataset.mindNode !== d.fromId) {
          to = { kind: 'node', id: nodeEl.dataset.mindNode! }
        } else if (imgEl) {
          const id = imgEl.dataset.mindImage!
          const img = dataRef.current.images.find(i => i.id === id)
          if (img) {
            const w = toWorld(e.clientX, e.clientY)
            to = {
              kind: 'image', id,
              ax: Math.min(1, Math.max(0, (w.x - img.x) / img.width)),
              ay: Math.min(1, Math.max(0, (w.y - img.y) / img.height)),
            }
          }
        }
        if (to) {
          const from: MindEndpoint = { kind: 'node', id: d.fromId }
          const dup = dataRef.current.edges.some(ed =>
            sameEnd(ed.from, from) && sameEnd(ed.to, to!) ||
            sameEnd(ed.from, to!) && sameEnd(ed.to, from))
          if (!dup) patch({ edges: [...dataRef.current.edges, { id: newId(), from, to }] })
        }
        setConnectPos(null)
      }
      dragRef.current = null
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [patch, toWorld])

  // ─── Wheel zoom (native, non-passive) — keeps the cursor's point anchored ───
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()   // block Folio's app-wide ctrl+wheel zoom
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const s = scaleRef.current, p = panRef.current
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const ns = Math.min(2.5, Math.max(0.2, s * factor))
      const wx = (cx - p.x) / s
      const wy = (cy - p.y) / s
      setScale(ns)
      setPan({ x: cx - wx * ns, y: cy - wy * ns })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ─── Keyboard: delete selected edge, Esc to close ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
        if (document.activeElement?.tagName === 'TEXTAREA') return
        e.preventDefault()
        patch({ edges: dataRef.current.edges.filter(ed => ed.id !== selectedEdge) })
        setSelectedEdge(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedEdge, patch, onClose])

  // ─── Actions ───────────────────────────────────────────────────────────────
  const addBubble = () => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const c = toWorld((rect?.left ?? 0) + (rect?.width ?? 600) / 2,
                      (rect?.top ?? 0) + (rect?.height ?? 400) / 2)
    const node: MindNode = {
      id: newId(), text: '',
      x: c.x - DEFAULT_NODE_W / 2, y: c.y - 40,
      width: DEFAULT_NODE_W,
      color: COLORS[Math.floor(Math.random() * (COLORS.length - 1))],
      fontSize: 15,
    }
    patch({ nodes: [...data.nodes, node] })
  }

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      const probe = new Image()
      probe.onload = () => {
        const w = 320
        const h = w * (probe.height / probe.width || 0.66)
        const rect = viewportRef.current?.getBoundingClientRect()
        const c = toWorld((rect?.left ?? 0) + (rect?.width ?? 600) / 2,
                          (rect?.top ?? 0) + (rect?.height ?? 400) / 2)
        const img: MindImage = { id: newId(), src, alt: file.name, x: c.x - w / 2, y: c.y - h / 2, width: w, height: h }
        patch({ images: [...dataRef.current.images, img] })
      }
      probe.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeNode = (id: string) => patch({
    nodes: data.nodes.filter(n => n.id !== id),
    edges: data.edges.filter(ed => !endTouches(ed, 'node', id)),
  })
  const removeImage = (id: string) => patch({
    images: data.images.filter(i => i.id !== id),
    edges: data.edges.filter(ed => !endTouches(ed, 'image', id)),
  })
  const updateNode = (id: string, p: Partial<MindNode>) =>
    patch({ nodes: data.nodes.map(n => n.id === id ? { ...n, ...p } : n) })

  const measure = useCallback((id: string, h: number) => {
    setHeights(prev => prev[id] === h ? prev : { ...prev, [id]: h })
  }, [])

  // ─── Drag starters ─────────────────────────────────────────────────────────
  const startNodeDrag = (e: ReactMouseEvent, n: MindNode) => {
    e.stopPropagation()
    setSelectedEdge(null)
    dragRef.current = { mode: 'node', id: n.id, startSX: e.clientX, startSY: e.clientY, origX: n.x, origY: n.y, moved: false }
  }
  const startImageDrag = (e: ReactMouseEvent, im: MindImage) => {
    e.stopPropagation()
    setSelectedEdge(null)
    dragRef.current = { mode: 'image', id: im.id, startSX: e.clientX, startSY: e.clientY, origX: im.x, origY: im.y, moved: false }
  }
  const startResize = (e: ReactMouseEvent, im: MindImage) => {
    e.stopPropagation(); e.preventDefault()
    dragRef.current = { mode: 'resize', id: im.id, startSX: e.clientX, origW: im.width, ratio: im.height / im.width }
  }
  const startConnect = (e: ReactMouseEvent, n: MindNode) => {
    e.stopPropagation(); e.preventDefault()
    dragRef.current = { mode: 'connect', fromId: n.id }
    setConnectPos(toWorld(e.clientX, e.clientY))
  }
  const startPan = (e: ReactMouseEvent) => {
    if (e.target !== viewportRef.current && !(e.target as HTMLElement).dataset.mindWorld) return
    setSelectedEdge(null)
    dragRef.current = { mode: 'pan', startSX: e.clientX, startSY: e.clientY, origPanX: pan.x, origPanY: pan.y }
  }

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }) }

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(t => t === msg ? null : t), 2600) }
  const doExport = async (fmt: MindExportFormat) => {
    setExportOpen(false)
    const res = await exportMindMap(fmt, data, heights)
    if (res.ok) flash('Exported ✓')
    else if (res.reason === 'empty') flash('Add a bubble or image first')
    else if (res.reason === 'error') flash('Export failed — see console')
    // 'cancelled' = user dismissed the save dialog; no message needed
  }

  const doOpen = async () => {
    const res = await importMindMap()
    if (!res.ok) { if (res.reason === 'error') flash('Could not open that file'); return }
    if ((data.nodes.length > 0 || data.images.length > 0) &&
        !window.confirm('Open this map? It will replace what is currently on the canvas.')) return
    onChange(res.data)
    setSelectedEdge(null)
    resetView()
    flash('Map opened ✓')
  }

  // Build edge geometry from live state.
  const renderEdges = () => {
    const segs: { edge: MindEdge; a: { x: number; y: number }; b: { x: number; y: number } }[] = []
    for (const edge of data.edges) {
      const a = endpointPos(edge.from)
      const b = endpointPos(edge.to)
      if (a && b) segs.push({ edge, a, b })
    }
    return segs
  }
  const segs = renderEdges()
  const connectFrom = dragRef.current?.mode === 'connect' ? endpointPos({ kind: 'node', id: dragRef.current.fromId }) : null

  const labelStyle = { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)' }}>
      <div
        ref={viewportRef}
        onMouseDown={startPan}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: dragRef.current?.mode === 'pan' ? 'grabbing' : 'default',
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px` }}
      >
        {/* World: everything inside pans & zooms together */}
        <div data-mind-world="1" style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
          {/* Images sit at the bottom of the stack */}
          {data.images.map(im => (
            <div
              key={im.id}
              data-mind-image={im.id}
              onMouseDown={e => startImageDrag(e, im)}
              style={{ position: 'absolute', left: im.x, top: im.y, width: im.width, height: im.height, cursor: 'grab' }}
            >
              <img src={im.src} alt={im.alt || ''} draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', userSelect: 'none' }} />
              <button onMouseDown={e => { e.stopPropagation(); e.preventDefault(); removeImage(im.id) }} title="Delete image"
                style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>✕</button>
              {/* corner resize handle */}
              <div onMouseDown={e => startResize(e, im)} title="Drag to resize"
                style={{ position: 'absolute', right: -5, bottom: -5, width: 14, height: 14, borderRadius: 3, background: 'var(--accent)', border: '2px solid var(--bg)', cursor: 'nwse-resize' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: 6, pointerEvents: 'none', outline: '1px dashed rgba(255,255,255,0.15)', outlineOffset: -1 }} />
            </div>
          ))}

          {/* Edges layer: above images, below bubbles */}
          <svg style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}>
            {segs.map(({ edge, a, b }) => {
              const sel = selectedEdge === edge.id
              return (
                <g key={edge.id}>
                  {/* wide invisible hit area */}
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14}
                    style={{ pointerEvents: dragRef.current ? 'none' : 'stroke', cursor: 'pointer' }}
                    onMouseDown={e => { e.stopPropagation(); setSelectedEdge(edge.id) }} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={sel ? 'var(--accent)' : 'var(--text3)'} strokeWidth={sel ? 3 : 2}
                    vectorEffect="non-scaling-stroke" pointerEvents="none" strokeLinecap="round" />
                  {/* dot where a line meets an image, at the exact connection point */}
                  {edge.to.kind === 'image' && <circle cx={b.x} cy={b.y} r={4} fill="var(--accent)" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                  {edge.from.kind === 'image' && <circle cx={a.x} cy={a.y} r={4} fill="var(--accent)" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                  {sel && (
                    <g style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                      onMouseDown={e => { e.stopPropagation(); patch({ edges: data.edges.filter(ed => ed.id !== edge.id) }); setSelectedEdge(null) }}>
                      <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={9} fill="var(--bg)" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 1} fill="var(--accent)" fontSize={11} textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>✕</text>
                    </g>
                  )}
                </g>
              )
            })}
            {/* live connection preview */}
            {connectFrom && connectPos && (
              <line x1={connectFrom.x} y1={connectFrom.y} x2={connectPos.x} y2={connectPos.y}
                stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            )}
          </svg>

          {/* Bubbles on top */}
          {data.nodes.map(n => (
            <NodeCard key={n.id} node={n} height={nodeHeight(n.id)}
              onMeasure={measure}
              onHeaderDown={e => startNodeDrag(e, n)}
              onConnectDown={e => startConnect(e, n)}
              onText={t => updateNode(n.id, { text: t })}
              onColor={c => updateNode(n.id, { color: c })}
              onRemove={() => removeNode(n.id)} />
          ))}
        </div>

        {/* Empty-canvas hint */}
        {data.nodes.length === 0 && data.images.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            <span style={{ fontSize: 34, opacity: 0.18 }}>🧠</span>
            <span style={{ ...labelStyle, color: 'var(--text3)' }}>Add a bubble to begin</span>
          </div>
        )}
      </div>

      {/* Top toolbar */}
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 15, color: 'var(--accent)', fontStyle: 'italic', marginRight: 6 }}>Mind Map</span>
        <Btn onClick={addBubble} primary>+ Bubble</Btn>
        <Btn onClick={() => fileInputRef.current?.click()}>Image</Btn>
        <Btn onClick={doOpen}>Open</Btn>
        <div style={{ position: 'relative' }}>
          <Btn onClick={() => setExportOpen(o => !o)} active={exportOpen}>Export ▾</Btn>
          {exportOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, minWidth: 200, boxShadow: '0 8px 28px rgba(0,0,0,0.45)', zIndex: 20 }}>
              <MenuItem title="PNG image" sub="Picture to share or print" onClick={() => doExport('png')} />
              <MenuItem title="SVG vector" sub="Scales sharp to any size" onClick={() => doExport('svg')} />
              <MenuItem title="Foliomap file" sub="Re-openable map (open it again later)" onClick={() => doExport('foliomap')} />
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <Btn onClick={resetView}>{Math.round(scale * 100)}%</Btn>
        <Btn onClick={onClose}>Close ✕</Btn>
      </div>

      {/* Close the export menu when clicking elsewhere */}
      {exportOpen && <div onMouseDown={() => setExportOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}

      {toast && (
        <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: 8, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.05em', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Hint */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, ...labelStyle, fontSize: 10, color: 'var(--text2)', pointerEvents: 'none', lineHeight: 1.6 }}>
        Drag the ◦ handle from a bubble to connect · drag canvas to pan · scroll to zoom · click a line then Del to remove
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickImage} />
    </div>
  )
}

function Btn({ children, onClick, primary, active }: { children: React.ReactNode; onClick: () => void; primary?: boolean; active?: boolean }) {
  const [hover, setHover] = useState(false)
  // Use --text (the high-contrast colour) for labels so buttons stay legible
  // across every theme; accent only for the primary/active states.
  const color = primary ? 'var(--bg)' : (active || hover) ? 'var(--accent)' : 'var(--text)'
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: primary ? 'var(--accent)' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6,
        color, cursor: 'pointer', padding: '6px 12px', transition: 'color 0.15s, border-color 0.15s',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

function MenuItem({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: hover ? 'rgba(128,128,128,0.15)' : 'none',
        border: 'none', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text)', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 12.5, color: 'var(--text2)', marginTop: 1 }}>{sub}</div>
    </button>
  )
}

// A single bubble. Measures its own height so connecting lines anchor correctly.
function NodeCard({ node, onMeasure, onHeaderDown, onConnectDown, onText, onColor, onRemove }: {
  node: MindNode
  height: number
  onMeasure: (id: string, h: number) => void
  onHeaderDown: (e: ReactMouseEvent) => void
  onConnectDown: (e: ReactMouseEvent) => void
  onText: (t: string) => void
  onColor: (c: string) => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => onMeasure(node.id, el.offsetHeight)
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [node.id, onMeasure])

  return (
    <div
      ref={ref}
      data-mind-node={node.id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'absolute', left: node.x, top: node.y, width: node.width, background: node.color,
        borderRadius: 8, boxShadow: '0 4px 18px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column' }}
    >
      <div onMouseDown={onHeaderDown}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', cursor: 'grab', background: 'rgba(0,0,0,0.06)', borderRadius: '8px 8px 0 0' }}>
        <div onMouseDown={e => e.stopPropagation()} title="Bubble colour"
          style={{ width: 13, height: 13, borderRadius: '50%', background: node.color, border: '1.5px solid rgba(0,0,0,0.25)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <input type="color" value={node.color} onChange={e => onColor(e.target.value)}
            style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: '200%', height: '200%' }} />
        </div>
        <div style={{ flex: 1 }} />
        <button onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onRemove() }} title="Delete bubble"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(0,0,0,0.4)', lineHeight: 1, fontFamily: 'monospace' }}>✕</button>
      </div>
      <textarea
        value={node.text}
        onChange={e => onText(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        placeholder="Idea…"
        rows={2}
        style={{ background: 'none', border: 'none', outline: 'none', resize: 'none', padding: '8px 10px',
          fontSize: node.fontSize, fontFamily: '"Crimson Pro", Georgia, serif', color: '#2a2520', lineHeight: 1.45,
          borderRadius: '0 0 8px 8px', overflow: 'hidden', minHeight: 40 }}
        onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
      />
      {/* Connection handle */}
      <div
        onMouseDown={onConnectDown}
        title="Drag to connect this bubble to another bubble or an image"
        style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)',
          width: 18, height: 18, borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--accent)',
          cursor: 'crosshair', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hover ? 1 : 0.45, transition: 'opacity 0.15s' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
      </div>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function sameEnd(a: MindEndpoint, b: MindEndpoint) { return a.kind === b.kind && a.id === b.id }
function endTouches(edge: MindEdge, kind: 'node' | 'image', id: string) {
  return (edge.from.kind === kind && edge.from.id === id) || (edge.to.kind === kind && edge.to.id === id)
}
