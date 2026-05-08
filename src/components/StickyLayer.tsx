import { useEffect, useRef } from 'react'
import type { StickyNote } from '../lib/storage'

const PRESETS = ['#f5e6a3', '#f0b8b8', '#b8e0b8', '#b8d0e8', '#d0b8e8']
const SIZES   = [11, 13, 15, 18, 22]

interface Props {
  notes: StickyNote[]
  scrollTop: number
  onChange: (notes: StickyNote[]) => void
}

export default function StickyLayer({ notes, scrollTop, onChange }: Props) {
  const notesRef  = useRef(notes)
  const scrollRef = useRef(scrollTop)
  const dragRef   = useRef<{ id: string; startX: number; startY: number; origX: number; origViewY: number } | null>(null)

  useEffect(() => { notesRef.current = notes },     [notes])
  useEffect(() => { scrollRef.current = scrollTop }, [scrollTop])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      onChange(notesRef.current.map(n => {
        if (n.id !== d.id) return n
        const newX     = d.origX + dx
        const newViewY = d.origViewY + dy
        return n.documentY !== null
          ? { ...n, x: newX, documentY: newViewY + scrollRef.current }
          : { ...n, x: newX, viewportY: newViewY }
      }))
    }
    const onUp = () => { dragRef.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [onChange])

  const update = (id: string, patch: Partial<StickyNote>) =>
    onChange(notes.map(n => n.id === id ? { ...n, ...patch } : n))

  const remove = (id: string) => onChange(notes.filter(n => n.id !== id))

  const togglePin = (note: StickyNote) => {
    if (note.documentY !== null) {
      update(note.id, { documentY: null, viewportY: note.documentY - scrollTop })
    } else {
      update(note.id, { documentY: note.viewportY + scrollTop })
    }
  }

  const ctrlBtn = (label: string, onClick: () => void, title?: string) => (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
      title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, padding: '1px 4px', borderRadius: 3, color: 'rgba(0,0,0,0.5)', lineHeight: 1, fontFamily: '"JetBrains Mono", monospace' }}
      onMouseOver={e => e.currentTarget.style.color = 'rgba(0,0,0,0.8)'}
      onMouseOut={e => e.currentTarget.style.color = 'rgba(0,0,0,0.5)'}
    >{label}</button>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 150 }}>
      {notes.map(note => {
        const y      = note.documentY !== null ? note.documentY - scrollTop : note.viewportY
        const pinned = note.documentY !== null
        const size   = note.fontSize ?? 13
        const sizeIdx = SIZES.indexOf(size)

        return (
          <div key={note.id} style={{ position: 'absolute', left: note.x, top: y, width: 230, pointerEvents: 'auto', background: note.color, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>

            {/* Header */}
            <div
              onMouseDown={e => {
                e.preventDefault()
                dragRef.current = { id: note.id, startX: e.clientX, startY: e.clientY, origX: note.x, origViewY: y }
              }}
              style={{ padding: '5px 7px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.07)', borderRadius: '8px 8px 0 0' }}
            >
              {/* Free colour picker */}
              <div
                onMouseDown={e => e.stopPropagation()}
                title="Pick colour"
                style={{ width: 14, height: 14, borderRadius: '50%', background: note.color, border: '1.5px solid rgba(0,0,0,0.3)', cursor: 'pointer', flexShrink: 0, position: 'relative', overflow: 'hidden' }}
              >
                <input
                  type="color"
                  value={note.color}
                  onChange={e => update(note.id, { color: e.target.value })}
                  style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }}
                />
              </div>

              {/* Quick presets */}
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {PRESETS.map(c => (
                  <div
                    key={c}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => update(note.id, { color: c })}
                    style={{ width: 10, height: 10, borderRadius: '50%', background: c, cursor: 'pointer', border: c === note.color ? '1.5px solid rgba(0,0,0,0.45)' : '1.5px solid transparent', flexShrink: 0 }}
                  />
                ))}
              </div>

              <div style={{ flex: 1 }} />

              {/* Font size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 1 }} onMouseDown={e => e.stopPropagation()}>
                {ctrlBtn('A−', () => update(note.id, { fontSize: SIZES[Math.max(0, sizeIdx - 1)] }), 'Smaller')}
                <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(0,0,0,0.45)', minWidth: 18, textAlign: 'center' }}>{size}</span>
                {ctrlBtn('A+', () => update(note.id, { fontSize: SIZES[Math.min(SIZES.length - 1, sizeIdx + 1)] }), 'Larger')}
              </div>

              {/* Pin + minimise + close */}
              <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => togglePin(note)}
                  title={pinned ? 'Unpin from scroll' : 'Pin to scroll position'}
                  style={{ background: pinned ? 'rgba(0,0,0,0.15)' : 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 4px', borderRadius: 3, color: 'rgba(0,0,0,0.55)', lineHeight: 1 }}
                >{pinned ? '📌' : '📍'}</button>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => update(note.id, { minimized: !note.minimized })}
                  title={note.minimized ? 'Expand' : 'Minimise'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 4px', borderRadius: 3, color: 'rgba(0,0,0,0.45)', lineHeight: 1 }}
                >{note.minimized ? '▸' : '▾'}</button>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => remove(note.id)}
                  title="Delete note"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 4px', borderRadius: 3, color: 'rgba(0,0,0,0.4)', lineHeight: 1 }}
                >✕</button>
              </div>
            </div>

            {/* Body */}
            {!note.minimized && (
              <textarea
                value={note.content}
                onChange={e => update(note.id, { content: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                placeholder="Note…"
                style={{ background: 'none', border: 'none', outline: 'none', resize: 'vertical', padding: '8px 10px', fontSize: size, fontFamily: '"Crimson Pro", Georgia, serif', color: '#2a2520', minHeight: 80, lineHeight: 1.6, borderRadius: '0 0 8px 8px' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
