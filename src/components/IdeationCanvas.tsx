import { useEffect, useRef } from 'react'
import type { IdeationNote } from '../lib/storage'

const COLORS   = ['#f5e6a3', '#f0b8b8', '#b8e0b8', '#b8d0e8', '#d0b8e8', '#fcd5a0', '#c8e6c9']
const FONTS    = ['Crimson Pro, Georgia, serif', 'Playfair Display, Georgia, serif', 'Georgia, serif', 'JetBrains Mono, monospace']
const SIZES    = [12, 16, 20, 24, 28]
const WIDTHS   = [180, 200, 220, 240, 260]

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

interface Props {
  notes: IdeationNote[]
  onChange: (notes: IdeationNote[]) => void
  onAdd: () => void
}

export default function IdeationCanvas({ notes, onChange, onAdd }: Props) {
  const notesRef = useRef(notes)
  const dragRef  = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  useEffect(() => { notesRef.current = notes }, [notes])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      onChange(notesRef.current.map(n =>
        n.id === d.id
          ? { ...n, x: d.origX + e.clientX - d.startX, y: d.origY + e.clientY - d.startY }
          : n
      ))
    }
    const onUp = () => { dragRef.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [onChange])

  const update = (id: string, patch: Partial<IdeationNote>) =>
    onChange(notes.map(n => n.id === id ? { ...n, ...patch } : n))

  const remove = (id: string) => onChange(notes.filter(n => n.id !== id))

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
    update(id, { rotation: Math.round(((note.rotation ?? 0) + delta) * 10) / 10 })
  }

  const iconBtn = (label: string, onClick: () => void, title: string) => (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 11, padding: '0 3px', color: 'rgba(0,0,0,0.4)',
        lineHeight: 1, fontFamily: 'monospace',
      }}
      onMouseOver={e => e.currentTarget.style.color = 'rgba(0,0,0,0.75)'}
      onMouseOut={e => e.currentTarget.style.color = 'rgba(0,0,0,0.4)'}
    >{label}</button>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Add idea button */}
      <button
        onClick={onAdd}
        style={{
          position: 'absolute', bottom: 20, right: 20, zIndex: 10,
          background: 'var(--accent)', border: 'none', borderRadius: 7,
          color: 'var(--bg)', cursor: 'pointer', padding: '8px 16px',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >+ Add idea</button>

      {notes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 32, opacity: 0.15 }}>💡</span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Add your first idea
          </span>
        </div>
      )}

      {[...notes].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map(note => (
        <div
          key={note.id}
          onMouseDown={() => bringToFront(note.id)}
          style={{
            position: 'absolute',
            left: note.x, top: note.y,
            width: note.width,
            zIndex: note.zIndex ?? 0,
            transform: `rotate(${note.rotation ?? 0}deg)`,
            background: note.color,
            borderRadius: 6,
            boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column',
            userSelect: 'none',
          }}
        >
          {/* Header */}
          <div
            onMouseDown={e => {
              e.preventDefault()
              e.stopPropagation()
              bringToFront(note.id)
              dragRef.current = { id: note.id, startX: e.clientX, startY: e.clientY, origX: note.x, origY: note.y }
            }}
            style={{
              padding: '4px 6px', cursor: 'grab',
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'rgba(0,0,0,0.06)', borderRadius: '6px 6px 0 0',
            }}
          >
            {/* Colour swatch */}
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

            {/* Rotation controls */}
            {iconBtn('↺', () => rotate(note.id, -15), 'Rotate left 15°')}
            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', fontFamily: 'monospace', minWidth: 26, textAlign: 'center' }}>
              {Math.round(note.rotation ?? 0)}°
            </span>
            {iconBtn('↻', () => rotate(note.id, 15), 'Rotate right 15°')}

            <div style={{ width: 1, height: 10, background: 'rgba(0,0,0,0.15)', margin: '0 2px' }} />

            {/* Layer controls */}
            {iconBtn('↑', () => bringToFront(note.id), 'Bring to front')}
            {iconBtn('↓', () => sendToBack(note.id), 'Send to back')}

            <div style={{ width: 1, height: 10, background: 'rgba(0,0,0,0.15)', margin: '0 2px' }} />

            {iconBtn('✕', () => remove(note.id), 'Delete note')}
          </div>

          {/* Content */}
          <textarea
            value={note.content}
            onChange={e => update(note.id, { content: e.target.value })}
            placeholder="Idea…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              resize: 'none', padding: '8px 10px',
              fontSize: note.fontSize,
              fontFamily: note.fontFamily,
              color: '#2a2520',
              minHeight: 70, lineHeight: 1.5,
              borderRadius: '0 0 6px 6px',
            }}
            rows={3}
          />
        </div>
      ))}
    </div>
  )
}
