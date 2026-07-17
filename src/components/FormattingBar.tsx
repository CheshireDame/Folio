import { Editor } from '@tiptap/react'
import { useState } from 'react'

interface FormattingBarProps {
  editor: Editor | null
  visible: boolean
}

const FONTS = ['Crimson Pro','Playfair Display','JetBrains Mono','Georgia','Arial','Times New Roman']
const COLORS = [
  '#e8e2d9','#c4a882','#d4a0a0','#c8906a','#e8c060',
  '#90b090','#90a8c0','#b0a0d0','#a0c4d0','#80c0a0',
  '#ffffff','#cccccc','#999999','#555555','#222222',
  '#e05050','#5080e0','#50c060','#c050c0','#e0a030',
]
const SIZES  = [12,14,16,18,20,22,24,28,32,36,48]

export default function FormattingBar({ editor, visible }: FormattingBarProps) {
  const [showFonts,      setShowFonts]      = useState(false)
  const [showSizes,      setShowSizes]      = useState(false)
  const [showColors,     setShowColors]     = useState(false)
  const [customColor,    setCustomColor]    = useState('#c4a882')

  if (!visible || !editor) return null

  const closeAll = () => { setShowFonts(false); setShowSizes(false); setShowColors(false) }

  const btn = (label: string, action: () => void, active = false, title = '', labelStyle?: React.CSSProperties) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); action() }}
      title={title || label}
      style={{
        background: active ? 'rgba(128,128,128,0.2)' : 'none',
        border: 'none',
        color: 'var(--toolbar-text)',
        opacity: active ? 1 : 0.85,
        cursor: 'pointer',
        padding: '3px 8px',
        borderRadius: 3,
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
        transition: 'opacity 0.15s',
      }}
      onMouseOver={e => { if(!active) e.currentTarget.style.opacity = '1' }}
      onMouseOut={e => { if(!active) e.currentTarget.style.opacity = '0.85' }}
    >{labelStyle ? <span style={labelStyle}>{label}</span> : label}</button>
  )

  const sep = () => (
    <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
  )

  const dd = (
    label: string,
    open: boolean,
    toggle: () => void,
    items: { label: string; action: () => void; style?: React.CSSProperties }[]
  ) => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onMouseDown={e => { e.preventDefault(); closeAll(); if (!open) toggle() }}
        style={{
          background: open ? 'var(--surface2)' : 'none',
          border: 'none', color: 'var(--toolbar-text)', cursor: 'pointer',
          padding: '3px 8px', borderRadius: 3, fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
          display: 'flex', alignItems: 'center', gap: 3,
          whiteSpace: 'nowrap' as const,
        }}
      >
        {label} <span style={{ fontSize: 7, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 4, zIndex: 500,
          minWidth: 160, maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {items.map(item => (
            <button
              key={item.label}
              onMouseDown={e => { e.preventDefault(); item.action(); closeAll() }}
              style={{
                display: 'block', width: '100%', background: 'none',
                border: 'none', color: 'var(--text)', cursor: 'pointer',
                padding: '6px 10px', textAlign: 'left', borderRadius: 4,
                fontSize: 13, ...item.style,
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(196,168,130,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  )

  const currentFont = editor.getAttributes('textStyle').fontFamily?.split(',')[0]?.replace(/"/g,'') || 'Font'
  const currentSize = editor.getAttributes('textStyle').fontSize?.replace('px','') || '—'

  return (
    <div style={{
      background: 'var(--toolbar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '3px 14px',
      height: 36,
      gap: 2,
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {dd(currentFont, showFonts, () => setShowFonts(f => !f),
        FONTS.map(f => ({ label: f, action: () => editor.chain().focus().setFontFamily(f).run(), style: { fontFamily: f } }))
      )}
      {sep()}
      {dd(currentSize + 'px', showSizes, () => setShowSizes(s => !s),
        SIZES.map(s => ({ label: s + 'px', action: () => editor.chain().focus().setMark('textStyle', { fontSize: s + 'px' }).run() }))
      )}
      {sep()}
      {btn('B', () => editor.chain().focus().toggleBold().run(),      editor.isActive('bold'),      'Bold',          { fontWeight: 700 })}
      {btn('I', () => editor.chain().focus().toggleItalic().run(),    editor.isActive('italic'),    'Italic',        { fontStyle: 'italic' })}
      {btn('U', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline',     { textDecoration: 'underline' })}
      {btn('S', () => editor.chain().focus().toggleStrike().run(),    editor.isActive('strike'),    'Strikethrough', { textDecoration: 'line-through' })}
      {sep()}
      {btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
      {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
      {sep()}
      {btn('≡ L', () => editor.chain().focus().setTextAlign('left').run(),    editor.isActive({ textAlign: 'left' }),    'Align left')}
      {btn('≡ C', () => editor.chain().focus().setTextAlign('center').run(),  editor.isActive({ textAlign: 'center' }),  'Align center')}
      {btn('≡ R', () => editor.chain().focus().setTextAlign('right').run(),   editor.isActive({ textAlign: 'right' }),   'Align right')}
      {btn('≡ J', () => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), 'Justify')}
      {sep()}
      {btn('x²', () => editor.chain().focus().toggleSuperscript().run(), editor.isActive('superscript'), 'Superscript')}
      {btn('x₂', () => editor.chain().focus().toggleSubscript().run(),   editor.isActive('subscript'),   'Subscript')}
      {sep()}
      {/* Color picker */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onMouseDown={e => { e.preventDefault(); closeAll(); if (!showColors) setShowColors(true) }}
          title="Text color"
          style={{ background: showColors ? 'rgba(128,128,128,0.2)' : 'none', border: 'none', color: 'var(--toolbar-text)', opacity: showColors ? 1 : 0.85, cursor: 'pointer', padding: '3px 8px', borderRadius: 3, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap' as const, flexShrink: 0 }}
          onMouseOver={e => { if (!showColors) e.currentTarget.style.opacity = '1' }}
          onMouseOut={e => { if (!showColors) e.currentTarget.style.opacity = '0.85' }}
        >🎨 Color</button>
        {showColors && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, zIndex: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 10 }}>
              {COLORS.map(c => (
                <div key={c} title={c}
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowColors(false) }}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.1s, transform 0.1s', boxSizing: 'border-box' as const }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.transform = 'scale(1.2)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)' }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 4, background: customColor, border: '1px solid var(--border)', position: 'relative' as const, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
              </div>
              <input
                type="text" value={customColor}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setCustomColor(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(customColor)) { editor.chain().focus().setColor(customColor).run(); setShowColors(false) } }}
                placeholder="#hex"
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '3px 6px', borderRadius: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none', minWidth: 0 }}
              />
              <button
                onMouseDown={e => { e.preventDefault(); if (/^#[0-9a-fA-F]{6}$/.test(customColor)) { editor.chain().focus().setColor(customColor).run(); setShowColors(false) } }}
                style={{ padding: '3px 8px', background: 'var(--accent)', border: 'none', color: '#1a1814', borderRadius: 4, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600, flexShrink: 0 }}
              >Apply</button>
            </div>
          </div>
        )}
      </div>
      {sep()}
      {btn('•• List', () => editor.chain().focus().toggleBulletList().run(),  editor.isActive('bulletList'),  'Bullet list')}
      {btn('1. List',           () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list')}
      {sep()}
      {btn('✕ Clear', () => editor.chain().focus().unsetAllMarks().run(), false, 'Clear formatting')}
    </div>
  )
}
