import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import type { MindMapData, MindNode, MindImage, MindEdge, MindEndpoint, IdeationNote, NoteSection } from '../lib/storage'
import { exportMindMap, importMindMap, type MindExportFormat } from '../lib/mindmapExport'
import { catmullRomSegments, segmentsToSvgPath, nearestSegmentIndex, type Pt, type CRSegment } from '../lib/mindmapCurve'
import { MIND_COLORS } from '../lib/mindmapColors'
import ColorSwatchPicker from './ColorSwatchPicker'

const DEFAULT_NODE_W = 180
const NODE_FALLBACK_H = 80   // used until a bubble's real height is measured

// One pointer interaction at a time. Stored in a ref so the global mouse
// handlers always read the live value.
type Drag =
  | { mode: 'node';   ids: string[]; startSX: number; startSY: number; origPositions: Record<string, { x: number; y: number }>; moved: boolean }
  | { mode: 'image';  id: string; startSX: number; startSY: number; origX: number; origY: number; moved: boolean }
  | { mode: 'resize'; id: string; startSX: number; origW: number; ratio: number }
  | { mode: 'pan';    startSX: number; startSY: number; origPanX: number; origPanY: number }
  | { mode: 'connect'; fromId: string }
  | { mode: 'edgePoint'; edgeId: string; index: number; startSX: number; startSY: number; origX: number; origY: number }
  | { mode: 'box'; startWX: number; startWY: number }

interface BoxSel { x1: number; y1: number; x2: number; y2: number }

interface Props {
  data: MindMapData
  onChange: (data: MindMapData) => void
  onClose: () => void
  ideationNotes: IdeationNote[]
  notesSections: NoteSection[]
}

let idCounter = 0
const newId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export default function MindMap({ data, onChange, onClose, ideationNotes, notesSections }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [edgeColorPickerFor, setEdgeColorPickerFor] = useState<string | null>(null)
  const [nodeColorPickerFor, setNodeColorPickerFor] = useState<string | null>(null)
  const [bulkColorPickerOpen, setBulkColorPickerOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // Live preview point (world coords) while dragging out a new connection.
  const [connectPos, setConnectPos] = useState<{ x: number; y: number } | null>(null)
  // Measured bubble heights (text makes them grow); keyed by node id.
  const [heights, setHeights] = useState<Record<string, number>>({})
  // Multi-select: bubble ids currently selected, and the live rubber-band box (world coords) while dragging one out.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [boxSel, setBoxSel] = useState<BoxSel | null>(null)
  // Bumped only to force a re-render when the mousedown/blur safety nets below
  // clear a stale dragRef — dragRef itself is a plain ref, so mutating it alone
  // wouldn't repaint the cursor/pointer-events that read it.
  const [, forceUpdate] = useState(0)
  // Bumped once a drag that can reshape an edge (moving a bubble/image, or
  // dragging a bend point) finishes. Folded into every edge's `key` below so
  // React throws away and recreates its DOM node rather than just updating its
  // `d` attribute in place — the WebView2 build this app ships on appears to
  // cache an SVG path's hit-testable stroke region and never recomputes it
  // after the shape changes (only an unrelated re-layout, like zooming, forces
  // that recheck), so an in-place update leaves the line's clickable area stuck
  // at its pre-drag shape. A fresh element has no stale region to be stuck on.
  const [geomVersion, setGeomVersion] = useState(0)

  // Refs mirror state so document-level listeners avoid stale closures.
  const dataRef = useRef(data);     useEffect(() => { dataRef.current = data }, [data])
  const onChangeRef = useRef(onChange); useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const scaleRef = useRef(scale);   useEffect(() => { scaleRef.current = scale }, [scale])
  const panRef = useRef(pan);       useEffect(() => { panRef.current = pan }, [pan])
  const heightsRef = useRef(heights); useEffect(() => { heightsRef.current = heights }, [heights])
  const dragRef = useRef<Drag | null>(null)

  // Forcing a fresh DOM node per edge (geomVersion, above) wasn't quite enough —
  // it fixes a line right after you reshape it, but panning the canvas afterward
  // makes it unclickable again until you zoom. That points at *scale* specifically
  // being what invalidates WebView2's cached hit-region (matching the by-hand
  // zoom workaround); a pure translate (pan) doesn't retrigger the same recheck.
  // So mimic zooming directly: nudge scale by a fraction of a percent and back on
  // the next frame. The revert is deferred to a real animation frame rather than
  // done synchronously, so the nudged value actually commits and paints —
  // otherwise React would just no-op the round trip and the browser would never
  // see a scale change to react to.
  // Tracks the scale from before an in-flight nudge, so the revert restores the
  // exact original value (rather than dividing back, which would drift the
  // stored scale a tiny bit further off on every single nudge — and this can
  // fire on every keystroke). Also lets rapid successive calls (e.g. fast
  // typing) collapse into one pending revert instead of stacking.
  const scaleNudgeBaseRef = useRef<number | null>(null)
  const scaleNudgeFrameRef = useRef<number | null>(null)
  const nudgeHitTest = useCallback(() => {
    if (scaleNudgeBaseRef.current === null) scaleNudgeBaseRef.current = scaleRef.current
    if (scaleNudgeFrameRef.current !== null) cancelAnimationFrame(scaleNudgeFrameRef.current)
    setScale(scaleNudgeBaseRef.current * 1.0005)
    scaleNudgeFrameRef.current = requestAnimationFrame(() => {
      setScale(scaleNudgeBaseRef.current!)
      scaleNudgeBaseRef.current = null
      scaleNudgeFrameRef.current = null
    })
  }, [])
  useEffect(() => {
    // Not while a drag is in flight. Bending a curve rewrites data.edges on
    // every mousemove tick, so nudging here fired continuously and read as the
    // canvas zooming in and out under the cursor. The mouseup handler runs it
    // once instead, when the shape is final — which is the only moment the
    // stale hit-region actually needs invalidating.
    if (dragRef.current) return
    nudgeHitTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.edges, data.nodes, data.images, heights])

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

  // World coordinates → screen (client) coordinates — inverse of toWorld, used
  // to anchor screen-space popovers (color pickers) to a world-space point.
  const worldToScreen = useCallback((wx: number, wy: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const s = scaleRef.current, p = panRef.current
    const ox = rect?.left ?? 0, oy = rect?.top ?? 0
    return { x: ox + wx * s + p.x, y: oy + wy * s + p.y }
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
      // Self-healing watchdog: if we think a drag is active but the mouse button
      // is actually no longer down, the mouseup that should have cleared it was
      // missed (seen in the Tauri webview — the exact trigger isn't reproducible
      // in a plain browser, but this check is correct regardless of cause: e.buttons
      // reflects the real, current button state on every mousemove tick, so a
      // missed mouseup self-corrects within one frame instead of leaving the
      // cursor/line permanently stuck).
      if (dragRef.current && e.buttons === 0) {
        dragRef.current = null
        setConnectPos(null)
        setBoxSel(null)
        forceUpdate(x => x + 1)
        return
      }
      const d = dragRef.current
      if (!d) return
      const s = scaleRef.current
      if (d.mode === 'pan') {
        setPan({ x: d.origPanX + (e.clientX - d.startSX), y: d.origPanY + (e.clientY - d.startSY) })
      } else if (d.mode === 'node') {
        const dx = (e.clientX - d.startSX) / s
        const dy = (e.clientY - d.startSY) / s
        if (!d.moved && Math.abs(e.clientX - d.startSX) + Math.abs(e.clientY - d.startSY) > 2) d.moved = true
        patch({ nodes: dataRef.current.nodes.map(n =>
          d.ids.includes(n.id) ? { ...n, x: d.origPositions[n.id].x + dx, y: d.origPositions[n.id].y + dy } : n
        ) })
      } else if (d.mode === 'image') {
        const dx = (e.clientX - d.startSX) / s
        const dy = (e.clientY - d.startSY) / s
        if (!d.moved && Math.abs(e.clientX - d.startSX) + Math.abs(e.clientY - d.startSY) > 2) d.moved = true
        patch({ images: dataRef.current.images.map(im =>
          im.id === d.id ? { ...im, x: d.origX + dx, y: d.origY + dy } : im
        ) })
      } else if (d.mode === 'resize') {
        const newW = Math.max(60, d.origW + (e.clientX - d.startSX) / s)
        patch({ images: dataRef.current.images.map(im =>
          im.id === d.id ? { ...im, width: newW, height: newW * d.ratio } : im) })
      } else if (d.mode === 'connect') {
        setConnectPos(toWorld(e.clientX, e.clientY))
      } else if (d.mode === 'edgePoint') {
        const dx = (e.clientX - d.startSX) / s
        const dy = (e.clientY - d.startSY) / s
        patch({ edges: dataRef.current.edges.map(ed =>
          ed.id === d.edgeId
            ? { ...ed, points: (ed.points ?? []).map((p, i) => i === d.index ? { x: d.origX + dx, y: d.origY + dy } : p) }
            : ed) })
      } else if (d.mode === 'box') {
        const w = toWorld(e.clientX, e.clientY)
        setBoxSel({ x1: Math.min(d.startWX, w.x), y1: Math.min(d.startWY, w.y), x2: Math.max(d.startWX, w.x), y2: Math.max(d.startWY, w.y) })
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
      } else if (d.mode === 'box') {
        const w = toWorld(e.clientX, e.clientY)
        const box = { x1: Math.min(d.startWX, w.x), y1: Math.min(d.startWY, w.y), x2: Math.max(d.startWX, w.x), y2: Math.max(d.startWY, w.y) }
        if (box.x2 - box.x1 > 4 || box.y2 - box.y1 > 4) {
          const hit = new Set(
            dataRef.current.nodes
              .filter(n => n.x < box.x2 && n.x + n.width > box.x1 && n.y < box.y2 && n.y + (heightsRef.current[n.id] ?? NODE_FALLBACK_H) > box.y1)
              .map(n => n.id)
          )
          setSelected(hit)
        }
        setBoxSel(null)
      }
      // Any of these can leave an edge a different shape than it was at mousedown
      // (moving an endpoint's bubble/image, dragging a bend point, or wiring up a
      // brand-new edge) — see geomVersion above for why that needs a fresh DOM node.
      if (d.mode === 'node' || d.mode === 'image' || d.mode === 'edgePoint' || d.mode === 'connect' || d.mode === 'resize') {
        setGeomVersion(v => v + 1)
        // The effect above skips itself mid-drag, so this is where the shape
        // that just settled gets its hit-region invalidated — once, not once
        // per mousemove.
        nudgeHitTest()
      }
      // Panning doesn't change any edge's shape, but it does shift where on screen
      // that shape's (WebView2-cached) hit-region sits — see nudgeHitTest above.
      if (d.mode === 'pan') nudgeHitTest()
      dragRef.current = null
    }

    // Safety net: a stale drag ref can be left behind if a mouseup is ever missed
    // (seen in the Tauri webview as a permanently "stuck" grabbing cursor and an
    // edge that stops responding to clicks — e.g. after curving a line). A new
    // mousedown can only happen once the previous button press has been released,
    // so it's always correct to clear any leftover drag state before the new
    // gesture's own handler runs. Capture phase guarantees this fires first.
    const onDownCapture = () => {
      if (dragRef.current) { dragRef.current = null; forceUpdate(x => x + 1) }
    }
    // Same idea for losing window focus mid-drag (e.g. alt-tab) — the mouseup
    // that would normally clean up never reaches us in that case.
    const onBlur = () => {
      if (dragRef.current) {
        dragRef.current = null
        setConnectPos(null)
        setBoxSel(null)
        forceUpdate(x => x + 1)
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('mousedown', onDownCapture, true)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mousedown', onDownCapture, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [patch, toWorld, nudgeHitTest])

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

  // ─── Keyboard: delete selected edge/bubbles, Esc clears selection then closes ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected.size > 0) { setSelected(new Set()); return }
        onClose(); return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'TEXTAREA') return
        if (selectedEdge) {
          e.preventDefault()
          patch({ edges: dataRef.current.edges.filter(ed => ed.id !== selectedEdge) })
          setSelectedEdge(null)
        } else if (selected.size > 0) {
          e.preventDefault()
          patch({
            nodes: dataRef.current.nodes.filter(n => !selected.has(n.id)),
            edges: dataRef.current.edges.filter(ed => ![...selected].some(id => endTouches(ed, 'node', id))),
          })
          setSelected(new Set())
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedEdge, selected, patch, onClose])

  // ─── Actions ───────────────────────────────────────────────────────────────
  const addBubble = () => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const c = toWorld((rect?.left ?? 0) + (rect?.width ?? 600) / 2,
                      (rect?.top ?? 0) + (rect?.height ?? 400) / 2)
    const node: MindNode = {
      id: newId(), text: '',
      x: c.x - DEFAULT_NODE_W / 2, y: c.y - 40,
      width: DEFAULT_NODE_W,
      color: MIND_COLORS[Math.floor(Math.random() * (MIND_COLORS.length - 1))],
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

  const removeNode = (id: string) => {
    patch({
      nodes: data.nodes.filter(n => n.id !== id),
      edges: data.edges.filter(ed => !endTouches(ed, 'node', id)),
    })
    setSelected(s => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n })
  }
  const bulkSetColor = (color: string) =>
    patch({ nodes: data.nodes.map(n => selected.has(n.id) ? { ...n, color } : n) })
  const bulkDelete = () => {
    patch({
      nodes: data.nodes.filter(n => !selected.has(n.id)),
      edges: data.edges.filter(ed => ![...selected].some(id => endTouches(ed, 'node', id))),
    })
    setSelected(new Set())
  }
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
    const isSelected = selected.has(n.id)
    const ids = isSelected ? [...selected] : [n.id]
    if (!isSelected) setSelected(new Set([n.id]))
    const origPositions: Record<string, { x: number; y: number }> = {}
    for (const node of data.nodes) if (ids.includes(node.id)) origPositions[node.id] = { x: node.x, y: node.y }
    dragRef.current = { mode: 'node', ids, startSX: e.clientX, startSY: e.clientY, origPositions, moved: false }
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
    if (e.shiftKey) {
      setSelected(new Set())
      const w = toWorld(e.clientX, e.clientY)
      dragRef.current = { mode: 'box', startWX: w.x, startWY: w.y }
    } else {
      setSelected(new Set())
      dragRef.current = { mode: 'pan', startSX: e.clientX, startSY: e.clientY, origPanX: pan.x, origPanY: pan.y }
    }
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

  // Where an import should land: centered in the viewport if the canvas is
  // empty, otherwise just beside whatever's already there so it never lands
  // on top of existing content.
  const landingSpot = () => {
    if (data.nodes.length === 0 && data.images.length === 0) {
      const rect = viewportRef.current?.getBoundingClientRect()
      return toWorld((rect?.left ?? 0) + (rect?.width ?? 600) / 2 - 100, (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - 100)
    }
    let maxX = -Infinity, minY = Infinity
    for (const n of data.nodes) { maxX = Math.max(maxX, n.x + n.width); minY = Math.min(minY, n.y) }
    for (const im of data.images) { maxX = Math.max(maxX, im.x + im.width); minY = Math.min(minY, im.y) }
    return { x: maxX + 80, y: minY }
  }

  const importIdeas = () => {
    if (ideationNotes.length === 0) { flash('No ideas on the Idea canvas to import'); return }
    const minX = Math.min(...ideationNotes.map(n => n.x))
    const minY = Math.min(...ideationNotes.map(n => n.y))
    const landing = landingSpot()
    const newNodes: MindNode[] = ideationNotes.map(n => ({
      id: newId(), text: n.content,
      x: landing.x + (n.x - minX), y: landing.y + (n.y - minY),
      width: n.width, color: n.color, fontSize: n.fontSize, rotation: n.rotation,
    }))
    patch({ nodes: [...data.nodes, ...newNodes] })
    flash(`Imported ${newNodes.length} idea${newNodes.length === 1 ? '' : 's'} ✓`)
  }

  const importNotesSections = () => {
    if (notesSections.length === 0) { flash('No notes-panel sections to import'); return }
    const landing = landingSpot()
    const COLS = 3, GUTTER = 24, ROW_H = 160
    const newNodes: MindNode[] = notesSections.map((s, i) => ({
      id: newId(),
      text: s.title ? `${s.title}\n\n${s.content}` : s.content,
      x: landing.x + (i % COLS) * (DEFAULT_NODE_W + GUTTER),
      y: landing.y + Math.floor(i / COLS) * ROW_H,
      width: DEFAULT_NODE_W,
      color: MIND_COLORS[Math.floor(Math.random() * (MIND_COLORS.length - 1))],
      fontSize: 15,
    }))
    patch({ nodes: [...data.nodes, ...newNodes] })
    flash(`Imported ${newNodes.length} note${newNodes.length === 1 ? '' : 's'} ✓`)
  }

  // Build curve geometry (bend points -> smooth path) from live state.
  interface EdgeGeom { edge: MindEdge; a: Pt; b: Pt; pts: Pt[]; cr: CRSegment[]; d: string; anchor: Pt; delPos: Pt; colorPos: Pt }
  const renderEdges = (): EdgeGeom[] => {
    const segs: EdgeGeom[] = []
    for (const edge of data.edges) {
      const a = endpointPos(edge.from)
      const b = endpointPos(edge.to)
      if (!a || !b) continue
      const pts: Pt[] = [a, ...(edge.points ?? []), b]
      const cr = catmullRomSegments(pts)
      const d = segmentsToSvgPath(pts[0], cr)
      const anchor = edge.points?.length ? edge.points[Math.floor((edge.points.length - 1) / 2)] : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      // Offset the delete/color buttons perpendicular to the line, off the path itself —
      // otherwise they render exactly where a user double-clicks to add a bend point, and
      // the second click of that double-click lands on the button instead.
      const dirX = b.x - a.x, dirY = b.y - a.y
      const len = Math.hypot(dirX, dirY) || 1
      const tx = dirX / len, ty = dirY / len
      const px = -ty, py = tx
      const delPos = { x: anchor.x + px * 18, y: anchor.y + py * 18 }
      const colorPos = { x: delPos.x - tx * 22, y: delPos.y - ty * 22 }
      segs.push({ edge, a, b, pts, cr, d, anchor, delPos, colorPos })
    }
    return segs
  }

  const addEdgePoint = (edge: MindEdge, pts: Pt[], cr: CRSegment[], click: Pt) => {
    const k = nearestSegmentIndex(pts, cr, click)
    // Nudge the new point perpendicular to the segment so the bend is visible right away —
    // dropping it exactly on the (already straight) line would produce zero visual change,
    // making the double-click look like it did nothing.
    const p0 = pts[k], p1 = pts[k + 1]
    const dirX = p1.x - p0.x, dirY = p1.y - p0.y
    const len = Math.hypot(dirX, dirY) || 1
    const nudged = { x: click.x - dirY / len * 24, y: click.y + dirX / len * 24 }
    const points = [...(edge.points ?? []).slice(0, k), nudged, ...(edge.points ?? []).slice(k)]
    patch({ edges: data.edges.map(ed => ed.id === edge.id ? { ...ed, points } : ed) })
  }
  const removeEdgePoint = (edgeId: string, index: number) =>
    patch({ edges: data.edges.map(ed => ed.id === edgeId ? { ...ed, points: (ed.points ?? []).filter((_, i) => i !== index) } : ed) })
  const setEdgeColor = (edgeId: string, color: string | undefined) =>
    patch({ edges: data.edges.map(ed => ed.id === edgeId ? { ...ed, color } : ed) })
  const startEdgePointDrag = (e: ReactMouseEvent, edgeId: string, index: number, p: Pt) => {
    e.stopPropagation()
    dragRef.current = { mode: 'edgePoint', edgeId, index, startSX: e.clientX, startSY: e.clientY, origX: p.x, origY: p.y }
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
          {/* A near-zero SVG box relying purely on overflow:visible to paint (and hit-test)
              content far outside it is an edge case that different engines can handle
              inconsistently — give it a generously large real box instead so every edge's
              hit-testing happens on content that's actually within the element's bounds. */}
          <svg style={{ position: 'absolute', left: 0, top: 0, width: 20000, height: 20000, overflow: 'visible', pointerEvents: 'none' }}>
            {segs.map(({ edge, a, b, pts, cr, d, delPos, colorPos }) => {
              const sel = selectedEdge === edge.id
              return (
                <g key={`${edge.id}-${geomVersion}`}>
                  {/* wide invisible hit area — double-click adds a bend point at that spot */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14}
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: dragRef.current ? 'none' : 'stroke', cursor: 'pointer' }}
                    onMouseDown={e => { e.stopPropagation(); setSelectedEdge(edge.id) }}
                    onDoubleClick={e => { e.stopPropagation(); addEdgePoint(edge, pts, cr, toWorld(e.clientX, e.clientY)) }} />
                  {/* Selection halo — sits under the real line so picking a color stays visible
                      immediately, instead of the old behaviour of overriding the stroke to the
                      accent color (which hid the change until the edge was deselected). */}
                  {sel && (
                    <path d={d} fill="none" stroke="var(--accent)" strokeWidth={7} strokeOpacity={0.35}
                      vectorEffect="non-scaling-stroke" pointerEvents="none" strokeLinecap="round" />
                  )}
                  <path d={d} fill="none"
                    stroke={edge.color || 'var(--text3)'} strokeWidth={sel ? 3 : 2}
                    vectorEffect="non-scaling-stroke" pointerEvents="none" strokeLinecap="round" />
                  {/* dot where a line meets an image, at the exact connection point */}
                  {edge.to.kind === 'image' && <circle cx={b.x} cy={b.y} r={4} fill="var(--accent)" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                  {edge.from.kind === 'image' && <circle cx={a.x} cy={a.y} r={4} fill="var(--accent)" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                  {/* draggable bend-point handles, double-click to remove */}
                  {sel && (edge.points ?? []).map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={5} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2}
                      vectorEffect="non-scaling-stroke" style={{ cursor: 'grab', pointerEvents: 'auto' }}
                      onMouseDown={e => startEdgePointDrag(e, edge.id, i, p)}
                      onDoubleClick={e => { e.stopPropagation(); removeEdgePoint(edge.id, i) }} />
                  ))}
                  {sel && (
                    <>
                      <g style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                        onMouseDown={e => { e.stopPropagation(); patch({ edges: data.edges.filter(ed => ed.id !== edge.id) }); setSelectedEdge(null) }}>
                        <circle cx={delPos.x} cy={delPos.y} r={9} fill="var(--bg)" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                        <text x={delPos.x} y={delPos.y + 1} fill="var(--accent)" fontSize={11} textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>✕</text>
                      </g>
                      <g style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                        onMouseDown={e => { e.stopPropagation(); setEdgeColorPickerFor(edgeColorPickerFor === edge.id ? null : edge.id) }}
                        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setEdgeColor(edge.id, undefined) }}>
                        <circle cx={colorPos.x} cy={colorPos.y} r={9} fill={edge.color || 'var(--text3)'} stroke="var(--bg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      </g>
                    </>
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
            <NodeCard key={n.id} node={n} height={nodeHeight(n.id)} selected={selected.has(n.id)}
              onMeasure={measure}
              onHeaderDown={e => startNodeDrag(e, n)}
              onConnectDown={e => startConnect(e, n)}
              onText={t => updateNode(n.id, { text: t })}
              onColorDotDown={e => { e.stopPropagation(); setNodeColorPickerFor(nodeColorPickerFor === n.id ? null : n.id) }}
              onRemove={() => removeNode(n.id)} />
          ))}

          {/* Rubber-band selection box (Shift+drag on empty canvas) */}
          {boxSel && (
            <div style={{ position: 'absolute', left: boxSel.x1, top: boxSel.y1, width: boxSel.x2 - boxSel.x1, height: boxSel.y2 - boxSel.y1,
              border: '1.5px solid var(--accent)', background: 'rgba(196,168,130,0.08)', pointerEvents: 'none', borderRadius: 2 }} />
          )}
        </div>

        {/* Empty-canvas hint */}
        {data.nodes.length === 0 && data.images.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            <span style={{ fontSize: 34, opacity: 0.18 }}>🧠</span>
            <span style={{ ...labelStyle, color: 'var(--text3)' }}>Add a bubble to begin</span>
          </div>
        )}
      </div>

      {/* Edge color popover — rendered outside data-mind-world so `position: fixed`
          anchors to the real viewport, not the pan/zoom-transformed world (a
          transformed ancestor turns `fixed` descendants into pseudo-absolute
          within it). */}
      {edgeColorPickerFor && (() => {
        const geom = segs.find(s => s.edge.id === edgeColorPickerFor)
        if (!geom) return null
        const screenPt = worldToScreen(geom.colorPos.x, geom.colorPos.y + 14)
        return (
          <ColorSwatchPicker
            value={geom.edge.color || '#6b6058'}
            onChange={c => setEdgeColor(geom.edge.id, c)}
            onClose={() => setEdgeColorPickerFor(null)}
            onReset={() => { setEdgeColor(geom.edge.id, undefined); setEdgeColorPickerFor(null) }}
            style={{ left: screenPt.x, top: screenPt.y }}
          />
        )
      })()}

      {/* Single-bubble color popover — same "outside the transform" reasoning as above */}
      {nodeColorPickerFor && (() => {
        const n = data.nodes.find(nd => nd.id === nodeColorPickerFor)
        if (!n) return null
        const screenPt = worldToScreen(n.x, n.y)
        return (
          <ColorSwatchPicker
            value={n.color}
            onChange={c => updateNode(n.id, { color: c })}
            onClose={() => setNodeColorPickerFor(null)}
            style={{ left: screenPt.x, top: screenPt.y + 26 }}
          />
        )
      })()}

      {/* Multi-select toolbar */}
      {selected.size > 0 && (
        <div style={{ position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 40 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text2)' }}>{selected.size} selected</span>
          <div style={{ position: 'relative' }}>
            <div onMouseDown={e => { e.stopPropagation(); setBulkColorPickerOpen(o => !o) }} title="Recolor selection"
              style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', border: '1px solid var(--border)', cursor: 'pointer' }} />
          </div>
          <Btn onClick={bulkDelete}>Delete</Btn>
        </div>
      )}
      {bulkColorPickerOpen && selected.size > 0 && (
        <ColorSwatchPicker
          value={data.nodes.find(n => selected.has(n.id))?.color || MIND_COLORS[0]}
          onChange={bulkSetColor}
          onClose={() => setBulkColorPickerOpen(false)}
          style={{ top: 90, left: '50%', transform: 'translateX(-50%)' }}
        />
      )}

      {/* Top toolbar */}
      {/* Sits on its own contrast-checked bar rather than straight on --bg: a
          custom theme can set any background colour, and the label/buttons were
          washing out against saturated ones. --menu-* is the palette App already
          pushes to AAA contrast, so redefining --text/--text2/--text3 here keeps
          every child (buttons, menus) legible on any theme. */}
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--menu-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px',
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
        '--text': 'var(--menu-text)', '--text2': 'var(--menu-text2)', '--text3': 'var(--menu-text3)' } as React.CSSProperties}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 15, color: 'var(--text)', fontStyle: 'italic', marginRight: 6 }}>Mind Map</span>
        <Btn onClick={addBubble} primary>+ Bubble</Btn>
        <Btn onClick={() => fileInputRef.current?.click()}>Image</Btn>
        <Btn onClick={doOpen}>Open</Btn>
        <div style={{ position: 'relative' }}>
          <Btn onClick={() => setImportOpen(o => !o)} active={importOpen}>Import ▾</Btn>
          {importOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, minWidth: 220, boxShadow: '0 8px 28px rgba(0,0,0,0.45)', zIndex: 20 }}>
              <MenuItem title="Ideas" sub={`${ideationNotes.length} idea${ideationNotes.length === 1 ? '' : 's'} from Stage 1`} onClick={() => { setImportOpen(false); importIdeas() }} />
              <MenuItem title="Notes panel" sub={`${notesSections.length} section${notesSections.length === 1 ? '' : 's'} from the Notes tab`} onClick={() => { setImportOpen(false); importNotesSections() }} />
            </div>
          )}
        </div>
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

      {/* Close the export/import menus when clicking elsewhere */}
      {(exportOpen || importOpen) && <div onMouseDown={() => { setExportOpen(false); setImportOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}

      {toast && (
        <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: 8, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.05em', boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Hint */}
      {/* On its own contrast-checked pill for the same reason as the toolbar —
          it previously sat straight on --bg, which a custom theme can set to
          any colour, washing the hint out entirely. */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, ...labelStyle, fontSize: 10,
        background: 'var(--menu-bg)', color: 'var(--menu-text2)',
        border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px',
        pointerEvents: 'none', lineHeight: 1.6 }}>
        Drag the ◦ handle to connect · double-click a line to bend it · Shift+drag to multi-select · drag canvas to pan · scroll to zoom
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickImage} />
    </div>
  )
}

function Btn({ children, onClick, primary, active }: { children: React.ReactNode; onClick: () => void; primary?: boolean; active?: boolean }) {
  const [hover, setHover] = useState(false)
  // Use --text (the high-contrast colour) for labels so buttons stay legible
  // across every theme; accent only for the primary/active states.
  // --accent-text is picked for contrast against the accent itself; --bg was a
  // coin flip once a custom theme could set bg and accent to similar colours.
  const color = primary ? 'var(--accent-ui-text)' : (active || hover) ? 'var(--accent-ui)' : 'var(--text)'
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      // Transparent so the label reads against the bar's contrast-checked
      // --menu-bg rather than --surface, which no theme guarantees.
      style={{ background: primary ? 'var(--accent-ui)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-ui)' : 'var(--border)'}`, borderRadius: 6,
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
function NodeCard({ node, selected, onMeasure, onHeaderDown, onConnectDown, onText, onColorDotDown, onRemove }: {
  node: MindNode
  height: number
  selected: boolean
  onMeasure: (id: string, h: number) => void
  onHeaderDown: (e: ReactMouseEvent) => void
  onConnectDown: (e: ReactMouseEvent) => void
  onText: (t: string) => void
  onColorDotDown: (e: ReactMouseEvent) => void
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
        borderRadius: 8,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        boxShadow: selected ? '0 0 0 2.5px var(--accent), 0 4px 18px rgba(0,0,0,0.28)' : '0 4px 18px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column' }}
    >
      <div onMouseDown={onHeaderDown}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', cursor: 'grab', background: 'rgba(0,0,0,0.06)', borderRadius: '8px 8px 0 0' }}>
        <div onMouseDown={onColorDotDown} title="Bubble colour"
          style={{ width: 13, height: 13, borderRadius: '50%', background: node.color, border: '1.5px solid rgba(0,0,0,0.25)', cursor: 'pointer', flexShrink: 0 }} />
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
