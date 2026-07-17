import { useRef, useState } from 'react'
import { playChime } from '../lib/chime'

const INTERVALS = [5, 10, 15, 20, 30, 45, 60, 90]

interface Props {
  enabled: boolean
  onToggleEnabled: () => void
  intervalSec: number
  onIntervalSecChange: (n: number) => void
  sound: boolean
  onToggleSound: () => void
  onClose: () => void
}

export default function PosturePopup({
  enabled, onToggleEnabled, intervalSec, onIntervalSecChange, sound, onToggleSound, onClose,
}: Props) {
  const customMin = Math.floor(intervalSec / 60)
  const customSec = intervalSec % 60

  const setCustom = (min: number, sec: number) => {
    const clampedMin = Math.max(0, Math.min(999, Math.floor(min) || 0))
    const clampedSec = Math.max(0, Math.min(59, Math.floor(sec) || 0))
    const total = clampedMin * 60 + clampedSec
    onIntervalSecChange(Math.max(1, total))
  }
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 140, y: 120 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

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

  const row = (label: string, control: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--text2)', width: 90, flexShrink: 0 }}>{label}</span>
      {control}
    </div>
  )

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
          Posture
        </span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
        >✕</button>
      </div>

      <div style={{ padding: '18px 20px 20px' }}>
        {row('Reminders', (
          <button
            onClick={onToggleEnabled}
            style={{ padding: '5px 14px', background: enabled ? 'var(--accent)' : 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: enabled ? 'var(--bg)' : 'var(--text3)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', transition: 'background 0.2s, color 0.2s' }}
          >{enabled ? 'On' : 'Off'}</button>
        ))}

        {row('Every', (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
            {INTERVALS.map(m => (
              <button
                key={m}
                onClick={() => onIntervalSecChange(m * 60)}
                style={{ padding: '4px 9px', background: intervalSec === m * 60 ? 'rgba(196,168,130,0.2)' : 'transparent', border: '1px solid var(--border)', borderRadius: 5, color: intervalSec === m * 60 ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}
              >{m}m</button>
            ))}
          </div>
        ))}

        {row('Custom', (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
            <input
              type="number" min={0} max={999} value={customMin}
              onChange={e => setCustom(Number(e.target.value), customSec)}
              style={{ width: 44, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 6px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>m</span>
            <input
              type="number" min={0} max={59} value={customSec}
              onChange={e => setCustom(customMin, Number(e.target.value))}
              style={{ width: 44, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 6px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>s</span>
          </div>
        ))}

        {row('Sound', (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
            <button
              onClick={onToggleSound}
              style={{ padding: '5px 14px', background: sound ? 'var(--accent)' : 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: sound ? 'var(--bg)' : 'var(--text3)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', transition: 'background 0.2s, color 0.2s' }}
            >{sound ? 'On' : 'Off'}</button>
            <button
              onClick={() => playChime(0.5)}
              title="Preview the reminder chime"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
            >🔔</button>
          </div>
        ))}
      </div>
    </div>
  )
}
