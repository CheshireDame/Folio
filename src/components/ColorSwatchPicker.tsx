import { MIND_COLORS } from '../lib/mindmapColors'

interface Props {
  value: string
  onChange: (hex: string) => void
  presets?: string[]
  style?: React.CSSProperties
  onClose: () => void
  /** When provided, shows a "Reset to default" row (used where a color is an optional override, e.g. edge color). */
  onReset?: () => void
}

// Reusable swatch-grid + hex-input color popover (mirrors SettingsModal's
// colorPicker() pattern). Renders its own full-screen dismiss overlay, so the
// caller just needs to mount this when open and supply a `style` with
// position/left/top.
//
// IMPORTANT: mount this OUTSIDE any transformed ancestor (e.g. MindMap's
// pan/zoom `data-mind-world` div) — a `transform` on an ancestor turns this
// component's `position: fixed` into pseudo-absolute within that ancestor's
// box instead of the real viewport.
export default function ColorSwatchPicker({ value, onChange, presets = MIND_COLORS, style, onClose, onReset }: Props) {
  return (
    <>
      <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950 }} />
      <div onMouseDown={e => e.stopPropagation()}
        style={{ position: 'fixed', zIndex: 951, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 10, width: 176, boxShadow: '0 8px 28px rgba(0,0,0,0.45)', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: value, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
            <input type="color" value={value} onChange={e => onChange(e.target.value)}
              style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
          </div>
          <input type="text" value={value} maxLength={7}
            onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value) }}
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 6px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {presets.map(c => (
            <div key={c} onClick={() => onChange(c)}
              style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                border: c === value ? '2px solid var(--accent)' : '2px solid transparent' }} />
          ))}
        </div>
        {onReset && (
          <button onMouseDown={e => { e.stopPropagation(); onReset() }}
            style={{ marginTop: 8, width: '100%', background: 'none', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', padding: '4px 8px', fontSize: 10, fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            Reset to default
          </button>
        )}
      </div>
    </>
  )
}
