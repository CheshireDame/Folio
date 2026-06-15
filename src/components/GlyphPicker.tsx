const CATEGORIES: { name: string; chars: string[] }[] = [
  {
    name: 'Interrogation & Interrobang',
    chars: ['‽', '⸮', '؟', ';', '¿', '¡'],
  },
  {
    name: 'Pause & Separation',
    chars: ['⸴', 'ⸯ', '⸒', '፡', '、', '。', '·', '–', '—', '⸻'],
  },
  {
    name: 'Paragraph & Structure',
    chars: ['¶', '⁋', '§', '⸿'],
  },
  {
    name: 'Reference Marks',
    chars: ['†', '‡', '※', '⁂', '⁑', '‸', '〃', '◊', '⁊', '№'],
  },
  {
    name: 'Literary Ornaments',
    chars: ['❧', '☙', '❦'],
  },
  {
    name: 'Quotation & Guillemets',
    chars: ['«', '»', '‹', '›', '“', '”', '‘', '’'],
  },
  {
    name: 'Direction & Index',
    chars: ['☞', '☜'],
  },
  {
    name: 'Ellipsis Variants',
    chars: ['⋯', '⋮', '⋰', '⋱', '…'],
  },
  {
    name: 'Stars & Asterisms',
    chars: ['✱', '✲', '⁂', '⁑', '✦', '✧', '★', '☆'],
  },
  {
    name: 'Mathematical & Fraction',
    chars: ['÷', '⁄', '℅', '℮', '⁓', '×', '±', '≈'],
  },
  {
    name: 'General Typographic',
    chars: ['#', '&', '~', '@', '°', '©', '®', '™', '…'],
  },
  {
    name: 'Musical & Symbols',
    chars: ['𝄐', '⌇'],
  },
]

interface GlyphPickerProps {
  onInsert: (char: string) => void
  topOffset: number
  onClose: () => void
}

export default function GlyphPicker({ onInsert, topOffset, onClose }: GlyphPickerProps) {
  const unicodeLabel = (char: string) => {
    const cp = char.codePointAt(0)
    return cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : ''
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
      <div style={{
        position: 'fixed',
        top: topOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px 18px',
        width: 520,
        maxHeight: '72vh',
        overflowY: 'auto',
        zIndex: 300,
        boxShadow: '0 10px 36px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 15, color: 'var(--accent)', fontStyle: 'italic' }}>
            Special Characters
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
          >✕</button>
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.name} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 7 }}>
              {cat.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {cat.chars.map((char, i) => (
                <button
                  key={i}
                  onClick={() => { onInsert(char); }}
                  title={unicodeLabel(char)}
                  style={{
                    width: 38, height: 38,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: 5,
                    cursor: 'pointer',
                    fontSize: 17,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Crimson Pro", Georgia, serif',
                    transition: 'border-color 0.12s, color 0.12s',
                    flexShrink: 0,
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'var(--text3)', textAlign: 'center' as const, marginTop: 4, letterSpacing: '0.07em' }}>
          Hover for unicode point · Click to insert
        </div>
      </div>
    </>
  )
}
