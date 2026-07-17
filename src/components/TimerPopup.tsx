import { useRef, useState } from 'react'

interface Props {
  timer: number
  running: boolean
  onToggle: () => void
  onReset: () => void
  onClose: () => void
}

export default function TimerPopup({ timer, running, onToggle, onReset, onClose }: Props) {
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 140, y: 120 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const h   = Math.floor(timer / 3600)
  const m   = Math.floor((timer % 3600) / 60)
  const s   = timer % 60
  const fmt = h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 280, dragRef.current.origX + ev.clientX - dragRef.current.startX)),
        y: Math.max(0, Math.min(window.innerHeight - 180, dragRef.current.origY + ev.clientY - dragRef.current.startY)),
      })
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 300,
        background: 'var(--menu-bg)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        width: 280, userSelect: 'none',
        '--text': 'var(--menu-text)', '--text2': 'var(--menu-text2)', '--text3': 'var(--menu-text3)',
      } as React.CSSProperties}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '10px 14px 6px',
          cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Timer
        </span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
        >✕</button>
      </div>

      {/* Clock face */}
      <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: h > 0 ? 52 : 68,
          fontWeight: 300,
          color: running ? 'var(--accent)' : 'var(--text)',
          letterSpacing: '0.05em',
          lineHeight: 1,
          transition: 'color 0.3s, font-size 0.2s',
        }}>
          {fmt}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', justifyContent: 'center' }}>
        <button
          onClick={onToggle}
          style={{
            flex: 1, padding: '9px 0',
            background: running ? 'rgba(196,168,130,0.15)' : 'var(--accent)',
            border: 'none', borderRadius: 7,
            color: running ? 'var(--accent)' : 'var(--bg)',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
          }}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={onReset}
          style={{
            padding: '9px 16px',
            background: 'none', border: '1px solid var(--border)', borderRadius: 7,
            color: 'var(--text3)',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--text2)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
