import { useEffect, useRef, useState } from 'react'
import type { WorkspaceImage } from '../lib/storage'

const SIZES = [150, 250, 350, 500, 700]

function ImageCard({ img, selected, scrollTop, onMouseDown, onUpdate, onRemove }: {
  img: WorkspaceImage
  selected: boolean
  scrollTop: number
  onMouseDown: (e: React.MouseEvent) => void
  onUpdate: (patch: Partial<WorkspaceImage>) => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const active = selected || hovered
  const pinned = img.documentY !== null

  const togglePin = () => {
    if (pinned) {
      onUpdate({ documentY: null, y: img.documentY! - scrollTop })
    } else {
      onUpdate({ documentY: img.y + scrollTop })
    }
  }

  return (
    <div
      data-ws-image
      style={{ position: 'absolute', left: img.x, top: img.y, width: img.width, pointerEvents: 'auto', cursor: 'grab', userSelect: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
    >
      <img
        src={img.src}
        alt={img.alt || ''}
        draggable={false}
        style={{
          width: '100%', display: 'block', borderRadius: 5,
          boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
          outline: selected ? '2px solid var(--accent)' : hovered ? '2px solid rgba(196,168,130,0.5)' : 'none',
          outlineOffset: 2,
        }}
      />
      {active && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 2,
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)', whiteSpace: 'nowrap', zIndex: 1000,
          }}
        >
          {SIZES.map(s => (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onUpdate({ width: s }) }}
              style={{
                background: img.width === s ? 'rgba(196,168,130,0.25)' : 'none',
                border: 'none', color: img.width === s ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', padding: '2px 5px', borderRadius: 3,
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
              }}
            >{s}px</button>
          ))}
          <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 2px' }} />
          <button
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); togglePin() }}
            title={pinned ? 'Unpin — image will stay in viewport' : 'Pin — image scrolls with content'}
            style={{
              background: pinned ? 'rgba(196,168,130,0.2)' : 'none',
              border: 'none', color: pinned ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', padding: '2px 5px', borderRadius: 3,
              fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
            }}
          >{pinned ? '📌' : '📍'}</button>
          <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 2px' }} />
          <button
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '2px 5px', borderRadius: 3, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
          >✕</button>
        </div>
      )}
    </div>
  )
}

interface Props {
  images: WorkspaceImage[]
  scrollTop: number
  onChange: (images: WorkspaceImage[]) => void
}

export default function WorkspaceImageLayer({ images, scrollTop, onChange }: Props) {
  const imgsRef = useRef(images)
  const scrollRef = useRef(scrollTop)
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origViewY: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)

  useEffect(() => { imgsRef.current = images }, [images])
  useEffect(() => { scrollRef.current = scrollTop }, [scrollTop])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      onChange(imgsRef.current.map(img => {
        if (img.id !== d.id) return img
        const newX = d.origX + dx
        const newViewY = d.origViewY + dy
        return img.documentY !== null
          ? { ...img, x: newX, documentY: newViewY + scrollRef.current }
          : { ...img, x: newX, y: newViewY }
      }))
    }
    const onUp = (e: MouseEvent) => {
      const d = dragRef.current
      if (d) {
        // Clamp so at least 60px of the image remains visible on screen
        const MARGIN = 60
        onChange(imgsRef.current.map(img => {
          if (img.id !== d.id) return img
          const clampedX = Math.max(-img.width + MARGIN, Math.min(window.innerWidth - MARGIN, img.x))
          if (img.documentY !== null) {
            const displayY = img.documentY - scrollRef.current
            const clampedDocY = Math.max(-(img.width) + MARGIN, displayY + scrollRef.current)
            return { ...img, x: clampedX, documentY: clampedDocY }
          }
          const clampedY = Math.max(-40, Math.min(window.innerHeight - MARGIN, img.y))
          return { ...img, x: clampedX, y: clampedY }
        }))
      }
      dragRef.current = null
      void e
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [onChange])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        e.preventDefault()
        onChange(imgsRef.current.filter(img => img.id !== selectedIdRef.current))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onChange])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-ws-image]')) setSelectedId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 145 }}>
      {images.map(img => {
        const displayY = img.documentY !== null ? img.documentY - scrollTop : img.y
        return (
          <ImageCard
            key={img.id}
            img={{ ...img, y: displayY }}
            selected={selectedId === img.id}
            scrollTop={scrollTop}
            onMouseDown={e => {
              e.stopPropagation()
              setSelectedId(img.id)
              dragRef.current = { id: img.id, startX: e.clientX, startY: e.clientY, origX: img.x, origViewY: displayY }
            }}
            onUpdate={patch => onChange(imgsRef.current.map(i => i.id === img.id ? { ...i, ...patch } : i))}
            onRemove={() => { onChange(images.filter(i => i.id !== img.id)); setSelectedId(null) }}
          />
        )
      })}
    </div>
  )
}
