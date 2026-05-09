import { useEffect, useRef, useState } from 'react'
import type { WorkspaceImage } from '../lib/storage'

const SIZES = [150, 250, 350, 500, 700]

function ImageCard({ img, selected, onMouseDown, onUpdate, onRemove }: {
  img: WorkspaceImage
  selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onUpdate: (patch: Partial<WorkspaceImage>) => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const active = selected || hovered

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
            background: '#1a1814', border: '1px solid #3a3630', borderRadius: 6,
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
                border: 'none', color: img.width === s ? '#c4a882' : '#e8e2d9',
                cursor: 'pointer', padding: '2px 5px', borderRadius: 3,
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
              }}
            >{s}px</button>
          ))}
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
          <button
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
            style={{ background: 'none', border: 'none', color: '#e8e2d9', cursor: 'pointer', padding: '2px 5px', borderRadius: 3, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
          >✕</button>
        </div>
      )}
    </div>
  )
}

interface Props {
  images: WorkspaceImage[]
  onChange: (images: WorkspaceImage[]) => void
}

export default function WorkspaceImageLayer({ images, onChange }: Props) {
  const imgsRef = useRef(images)
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)

  useEffect(() => { imgsRef.current = images }, [images])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // Drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      onChange(imgsRef.current.map(img =>
        img.id === d.id
          ? { ...img, x: d.origX + e.clientX - d.startX, y: d.origY + e.clientY - d.startY }
          : img
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

  // Delete selected image with Delete or Backspace
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

  // Click outside any image clears selection
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-ws-image]')) setSelectedId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 145 }}>
      {images.map(img => (
        <ImageCard
          key={img.id}
          img={img}
          selected={selectedId === img.id}
          onMouseDown={e => {
            e.stopPropagation()
            setSelectedId(img.id)
            dragRef.current = { id: img.id, startX: e.clientX, startY: e.clientY, origX: img.x, origY: img.y }
          }}
          onUpdate={patch => onChange(imgsRef.current.map(i => i.id === img.id ? { ...i, ...patch } : i))}
          onRemove={() => { onChange(images.filter(i => i.id !== img.id)); setSelectedId(null) }}
        />
      ))}
    </div>
  )
}
