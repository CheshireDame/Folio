interface SpacingPanelProps {
  lineHeight: number
  onLineHeight: (n: number) => void
  paragraphSpacing: number
  onParagraphSpacing: (n: number) => void
  topOffset: number
  onClose: () => void
}

const LINE_PRESETS = [
  { label: '1×',   value: 1.0 },
  { label: '1.5×', value: 1.5 },
  { label: '2×',   value: 2.0 },
]

const PARA_PRESETS = [
  { label: 'Compact', value: 0.3 },
  { label: 'Normal',  value: 0.8 },
  { label: 'Relaxed', value: 1.6 },
]

export default function SpacingPanel({
  lineHeight, onLineHeight,
  paragraphSpacing, onParagraphSpacing,
  topOffset, onClose,
}: SpacingPanelProps) {

  const sectionLabel = (text: string) => (
    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 8 }}>
      {text}
    </div>
  )

  const presetRow = (
    presets: { label: string; value: number }[],
    current: number,
    onChange: (n: number) => void,
  ) => (
    <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
      {presets.map(p => {
        const active = Math.abs(current - p.value) < 0.01
        return (
          <button key={p.value} onClick={() => onChange(p.value)} style={{
            flex: 1, padding: '5px 0',
            borderRadius: 5,
            border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
            background: active ? 'rgba(196,168,130,0.12)' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--text2)',
            cursor: 'pointer',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.04em',
          }}>{p.label}</button>
        )
      })}
    </div>
  )

  const customRow = (
    value: number,
    onChange: (n: number) => void,
    min: number, max: number, step: number,
  ) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
      />
      <input
        type="number" min={min} max={max} step={step} value={value}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v) && v >= min && v <= max)
            onChange(Math.round(v / step) * step)
        }}
        style={{
          width: 54, background: 'var(--bg)', border: '1px solid var(--border)',
          color: 'var(--text)', padding: '3px 6px', borderRadius: 5,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          textAlign: 'center' as const, outline: 'none',
        }}
      />
    </div>
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
      <div style={{
        position: 'fixed',
        top: topOffset,
        left: 8,
        background: 'var(--menu-bg)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        padding: '14px 16px',
        width: 290,
        zIndex: 300,
        boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        '--text': 'var(--menu-text)', '--text2': 'var(--menu-text2)', '--text3': 'var(--menu-text3)',
      } as React.CSSProperties}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 13, color: 'var(--accent)', fontStyle: 'italic', marginBottom: 14 }}>
          Spacing
        </div>

        {sectionLabel('Line Height')}
        {presetRow(LINE_PRESETS, lineHeight, onLineHeight)}
        {customRow(lineHeight, onLineHeight, 0.8, 3.0, 0.05)}

        <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0 12px' }} />

        {sectionLabel('Paragraph Spacing')}
        {presetRow(PARA_PRESETS, paragraphSpacing, onParagraphSpacing)}
        {customRow(paragraphSpacing, onParagraphSpacing, 0, 3.0, 0.1)}
      </div>
    </>
  )
}
