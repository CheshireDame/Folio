import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import type { IdeationNote } from '../lib/storage'

const COLORS = ['#f5e6a3', '#f0b8b8', '#b8e0b8', '#b8d0e8', '#d0b8e8', '#fcd5a0', '#c8e6c9']
const FONTS  = ['Crimson Pro, Georgia, serif', 'Playfair Display, Georgia, serif', 'Georgia, serif', 'JetBrains Mono, monospace']
const SIZES  = [12, 16, 20, 24, 28]
const WIDTHS = [180, 200, 220, 240, 260]

const NOTE_EST_HEIGHT = 120

export function makeIdeationNote(canvasW: number, canvasH: number): IdeationNote {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    content: '',
    x: Math.random() * Math.max(60, canvasW - 280) + 20,
    y: Math.random() * Math.max(60, canvasH - 220) + 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    fontSize: SIZES[Math.floor(Math.random() * SIZES.length)],
    fontFamily: FONTS[Math.floor(Math.random() * FONTS.length)],
    rotation: (Math.random() - 0.5) * 12,
    width: WIDTHS[Math.floor(Math.random() * WIDTHS.length)],
    zIndex: Date.now(),
  }
}

type NotesDrag = {
  mode: 'note'
  ids: string[]
  startX: number; startY: number
  origPositions: Record<string, { x: number; y: number }>
}
type BoxDrag = {
  mode: 'box'
  startCanvasX: number; startCanvasY: number
}
interface BoxSel { x1: number; y1: number; x2: number; y2: number }

interface Props {
  notes: IdeationNote[]
  onChange: (notes: IdeationNote[]) => void
  onAdd: () => void
}

export default function IdeationCanvas({ notes, onChange, onAdd }: Props) {
  const notesRef     = useRef(notes)
  const onChangeRef  = useRef(onChange)
  const historyRef   = useRef<IdeationNote[][]>([])
  const pendingRef   = useRef<IdeationNote[] | null>(null)  // snapshot captured at drag start
  const textBeforeRef = useRef<IdeationNote[] | null>(null) // snapshot captured before typing burst
  const textTimerRef = useRef<number | null>(null)
  const canvasRef    = useRef<HTMLDivElement>(null)
  const dragRef      = useRef<NotesDrag | BoxDrag | null>(null)

  const [boxSel,   setBoxSel]   = useState<BoxSel | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => { notesRef.current  = notes },   [notes])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const pushHistory = useCallback((snapshot: IdeationNote[]) => {
    historyRef.current = [...historyRef.current.slice(-49), snapshot]
  }, [])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    onChangeRef.current(historyRef.current.pop()!)
    setSelected(new Set())
  }, [])

  // Ctrl-Z — only when a note textarea is NOT the active element (let browser handle text undo there)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement?.tagName === 'TEXTAREA') return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  // Global mouse move / up
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.mode === 'note') {
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        onChangeRef.current(
          notesRef.current.map(n =>
            d.ids.includes(n.id)
              ? { ...n, x: d.origPositions[n.id].x + dx, y: d.origPositions[n.id].y + dy }
              : n
          )
        )
      } else {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        setBoxSel({
          x1: Math.min(d.startCanvasX, cx), y1: Math.min(d.startCanvasY, cy),
          x2: Math.max(d.startCanvasX, cx), y2: Math.max(d.startCanvasY, cy),
        })
      }
    }

    const onUp = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.mode === 'note') {
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        // Only commit to history if the notes actually moved
        if ((Math.abs(dx) > 2 || Math.abs(dy) > 2) && pendingRef.current) {
          pushHistory(pendingRef.current)
        }
        pendingRef.current = null
      } else {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const cx = e.clientX - rect.left
          const cy = e.clientY - rect.top
          const box = {
            x1: Math.min(d.startCanvasX, cx), y1: Math.min(d.startCanvasY, cy),
            x2: Math.max(d.startCanvasX, cx), y2: Math.max(d.startCanvasY, cy),
          }
          if (box.x2 - box.x1 > 4 || box.y2 - box.y1 > 4) {
            const hit = new Set(
              notesRef.current
                .filter(n =>
                  n.x < box.x2 && n.x + n.width > box.x1 &&
                  n.y < box.y2 && n.y + NOTE_EST_HEIGHT > box.y1
                )
                .map(n => n.id)
            )
            setSelected(hit)
          } else {
            setSelected(new Set())
          }
        }
        setBoxSel(null)
      }
      dragRef.current = null
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [pushHistory])

  const update = (id: string, patch: Partial<IdeationNote>) =>
    onChange(notes.map(n => n.id === id ? { ...n, ...patch } : n))

  const remove = (id: string) => {
    pushHistory([...notesRef.current])
    onChange(notes.filter(n => n.id !== id))
    setSelected(s => { const n = new Set(s); n.delete(id); return n })
  }

  const clearAll = () => {
    if (notes.length === 0) return
    if (!window.confirm('Clear all ideas from the canvas?\n\nYou can undo this with Ctrl-Z.')) return
    pushHistory([...notesRef.current])
    onChange([])
    setSelected(new Set())
  }

  const handleAdd = () => {
    pushHistory([...notesRef.current])
    onAdd()
  }

  const bringToFront = (id: string) => {
    const maxZ = Math.max(0, ...notes.map(n => n.zIndex ?? 0))
    update(id, { zIndex: maxZ + 1 })
  }

  const sendToBack = (id: string) => {
    const minZ = Math.min(...notes.map(n => n.zIndex ?? 0))
    update(id, { zIndex: minZ - 1 })
  }

  const rotate = (id: string, delta: number) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    pushHistory([...notesRef.current])
    update(id, { rotation: Math.round(((note.rotation ?? 0) + delta) * 10) / 10 })
  }

  const handleNoteHeaderMouseDown = (e: ReactMouseEvent, note: IdeationNote) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture state before bringToFront modifies z-index
    pendingRef.current = [...notesRef.current]
    bringToFront(note.id)

    const isSelected = selected.has(note.id)
    const dragIds = isSelected ? [...selected] : [note.id]
    if (!isSelected) setSelected(new Set([note.id]))

    const origPositions: Record<string, { x: number; y: number }> = {}
    notesRef.current.forEach(n => {
      if (dragIds.includes(n.id)) origPositions[n.id] = { x: n.x, y: n.y }
    })

    dragRef.current = { mode: 'note', ids: dragIds, startX: e.clientX, startY: e.clientY, origPositions }
  }

  const handleCanvasMouseDown = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement) !== canvasRef.current) return
    setSelected(new Set())
    const rect = canvasRef.current!.getBoundingClientRect()
    dragRef.current = {
      mode: 'box',
      startCanvasX: e.clientX - rect.left,
      startCanvasY: e.clientY - rect.top,
    }
  }

  const iconBtn = (label: string, onClick: () => void, title: string) => (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
      title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '0 3px', color: 'rgba(0,0,0,0.4)', lineHeight: 1, fontFamily: 'monospace' }}
      onMouseOver={e => e.currentTarget.style.color = 'rgba(0,0,0,0.75)'}
      onMouseOut={e => e.currentTarget.style.color = 'rgba(0,0,0,0.4)'}
    >{label}</button>
  )

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      {/* Drag-to-select box */}
      {boxSel && (
        <div style={{
          position: 'absolute',
          left: boxSel.x1, top: boxSel.y1,
          width: boxSel.x2 - boxSel.x1, height: boxSel.y2 - boxSel.y1,
          border: '1.5px solid var(--accent)',
          background: 'rgba(196,168,130,0.08)',
          pointerEvents: 'none',
          zIndex: 9999, borderRadius: 2,
        }} />
      )}

      {notes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
          <span style={{ fontSize: 32, opacity: 0.15 }}>💡</span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Add your first idea
          </span>
        </div>
      )}

      {/* Bottom-right controls */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        {notes.length > 0 && (
          <button
            onClick={clearAll}
            style={{ background: 'rgba(180,60,60,0.1)', border: '1px solid rgba(180,60,60,0.25)', borderRadius: 7, color: '#c47070', cursor: 'pointer', padding: '8px 14px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(180,60,60,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(180,60,60,0.1)'}
          >Clear</button>
        )}
        <button
          onClick={handleAdd}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 7, color: 'var(--accent-text)', cursor: 'pointer', padding: '8px 16px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
        >+ Add idea</button>
      </div>

      {/* Hint */}
      {notes.length > 0 && (
        <div style={{ position: 'absolute', bottom: 24, left: 16, fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.06em', pointerEvents: 'none', opacity: 0.6 }}>
          Drag canvas to select · Ctrl-Z to undo
        </div>
      )}

      {[...notes].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map(note => {
        const isSelected = selected.has(note.id)
        return (
          <div
            key={note.id}
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: note.x, top: note.y,
              width: note.width,
              zIndex: note.zIndex ?? 0,
              transform: `rotate(${note.rotation ?? 0}deg)`,
              background: note.color,
              borderRadius: 6,
              boxShadow: isSelected
                ? '0 0 0 2.5px var(--accent), 0 6px 20px rgba(0,0,0,0.3)'
                : '0 4px 18px rgba(0,0,0,0.25)',
              display: 'flex', flexDirection: 'column',
              userSelect: 'none',
            }}
          >
            {/* Drag handle / header */}
            <div
              onMouseDown={e => handleNoteHeaderMouseDown(e, note)}
              style={{ padding: '4px 6px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.06)', borderRadius: '6px 6px 0 0' }}
            >
              <div
                onMouseDown={e => e.stopPropagation()}
                style={{ width: 13, height: 13, borderRadius: '50%', background: note.color, border: '1.5px solid rgba(0,0,0,0.25)', cursor: 'pointer', position: 'relative', overflow: 'hidden', flexShrink: 0 }}
              >
                <input
                  type="color" value={note.color}
                  onChange={e => update(note.id, { color: e.target.value })}
                  style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100%+8px)', height: 'calc(100%+8px)' }}
                />
              </div>
              <div style={{ flex: 1 }} />
              {iconBtn('↺', () => rotate(note.id, -15), 'Rotate left 15°')}
              <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', fontFamily: 'monospace', minWidth: 26, textAlign: 'center' as const }}>
                {Math.round(note.rotation ?? 0)}°
              </span>
              {iconBtn('↻', () => rotate(note.id, 15), 'Rotate right 15°')}
              <div style={{ width: 1, height: 10, background: 'rgba(0,0,0,0.15)', margin: '0 2px' }} />
              {iconBtn('↑', () => bringToFront(note.id), 'Bring to front')}
              {iconBtn('↓', () => sendToBack(note.id), 'Send to back')}
              <div style={{ width: 1, height: 10, background: 'rgba(0,0,0,0.15)', margin: '0 2px' }} />
              {iconBtn('✕', () => remove(note.id), 'Delete note')}
            </div>

            <textarea
              value={note.content}
              onChange={e => {
                // Capture "before" snapshot on the first keystroke of a typing burst
                if (!textBeforeRef.current) {
                  textBeforeRef.current = [...notesRef.current]
                }
                if (textTimerRef.current) clearTimeout(textTimerRef.current)
                textTimerRef.current = window.setTimeout(() => {
                  if (textBeforeRef.current) {
                    pushHistory(textBeforeRef.current)
                    textBeforeRef.current = null
                  }
                  textTimerRef.current = null
                }, 800)
                update(note.id, { content: e.target.value })
              }}
              onMouseDown={e => e.stopPropagation()}
              placeholder="Idea…"
              style={{ background: 'none', border: 'none', outline: 'none', resize: 'none', padding: '8px 10px', fontSize: note.fontSize, fontFamily: note.fontFamily, color: '#2a2520', minHeight: 70, lineHeight: 1.5, borderRadius: '0 0 6px 6px' }}
              rows={3}
            />
          </div>
        )
      })}
    </div>
  )
}
