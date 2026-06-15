import { useEffect, useState } from 'react'

const MESSAGES = [
  'Sit up straight — your back will thank you.',
  'Time to check your posture.',
  'Roll your shoulders back and take a breath.',
  'Chin up, back straight — you\'re doing great.',
  'Quick break — stretch your neck side to side.',
  'Eyes up from the screen for a moment.',
]

interface Props {
  onDismiss: () => void
}

export default function PostureToast({ onDismiss }: Props) {
  const [visible, setVisible] = useState(false)
  const [message] = useState(() => MESSAGES[Math.floor(Date.now() / 1000) % MESSAGES.length])

  useEffect(() => {
    const showTimer  = setTimeout(() => setVisible(true), 50)
    const hideTimer  = setTimeout(() => setVisible(false), 6000)
    const closeTimer = setTimeout(onDismiss, 6500)
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(closeTimer) }
  }, [onDismiss])

  const dismiss = () => { setVisible(false); setTimeout(onDismiss, 400) }

  return (
    <div
      style={{
        position: 'fixed', bottom: 52, left: '50%', transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease, transform 0.35s ease',
        zIndex: 500, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: '"JetBrains Mono", monospace',
        minWidth: 280, maxWidth: 400,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>🪑</span>
      <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, flex: 1 }}>{message}</span>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
      >✕</button>
    </div>
  )
}
