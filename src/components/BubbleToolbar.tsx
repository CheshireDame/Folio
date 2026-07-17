import { Editor } from '@tiptap/react'
import { useState, useEffect, useRef } from 'react'

interface BubbleToolbarProps {
  editor: Editor | null
  onTriggerComment: () => void
}

const FONTS  = ['Crimson Pro','Playfair Display','JetBrains Mono','Georgia','Arial','Times New Roman']
const COLORS = ['#e8e2d9','#c4a882','#d4a0a0','#90b090','#90a8c0','#b0a0d0','#ffffff','#aaaaaa','#666666','#333333']
const SIZES  = [12,14,16,18,20,22,24,28,32,36,48]

const GAP = 6

export default function BubbleToolbar({ editor, onTriggerComment }: BubbleToolbarProps) {
  const [visible,    setVisible]    = useState(false)
  const [pos,        setPos]        = useState({ x: 0, y: 0 })
  const [showFonts,  setShowFonts]  = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showSizes,  setShowSizes]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return
    const update = () => {
      if (editor.isActive('image')) { setVisible(false); return }

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { setVisible(false); return }

      const range = sel.getRangeAt(0)
      if (!editor.view.dom.contains(range.commonAncestorContainer)) { setVisible(false); return }

      const rects = Array.from(range.getClientRects())
      if (!rects.length) { setVisible(false); return }

      const fullRect   = range.getBoundingClientRect()
      const lowestRect = rects.reduce((a, b) => b.bottom > a.bottom ? b : a)

      setPos({
        x: fullRect.left + fullRect.width / 2,
        y: lowestRect.bottom + GAP,
      })
      setVisible(true)
    }

    document.addEventListener('selectionchange', update)
    return () => { document.removeEventListener('selectionchange', update) }
  }, [editor])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowFonts(false); setShowColors(false); setShowSizes(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!visible || !editor) return null

  const toolbarW = ref.current?.offsetWidth || 520
  const x = Math.max(8, Math.min(pos.x - toolbarW / 2, window.innerWidth - toolbarW - 8))
  const y = Math.min(pos.y, window.innerHeight - 52)

  const closeAll = () => { setShowFonts(false); setShowColors(false); setShowSizes(false) }

  const btn = (label: string, action: () => void, active = false, title = '', labelStyle?: React.CSSProperties) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); action() }}
      title={title}
      style={{
        background: active ? 'rgba(196,168,130,0.25)' : 'none',
        border: 'none', color: active ? 'var(--accent)' : 'var(--text)',
        cursor: 'pointer', padding: '4px 7px', borderRadius: 3,
        fontSize: 12, fontFamily: '"JetBrains Mono", monospace',
        whiteSpace: 'nowrap' as const, flexShrink: 0,
      }}
    >{labelStyle ? <span style={labelStyle}>{label}</span> : label}</button>
  )

  const sep = () => <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />

  const dd = (
    label: string,
    open: boolean,
    toggle: () => void,
    items: { label: string; action: () => void; style?: React.CSSProperties }[]
  ) => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onMouseDown={e => { e.preventDefault(); closeAll(); if (!open) toggle() }}
        style={{ background: open ? 'rgba(196,168,130,0.2)' : 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px 7px', borderRadius: 3, fontSize: 11, fontFamily: '"JetBrains Mono",monospace', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' as const }}
      >
        {label} <span style={{ fontSize: 7, opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 4, zIndex: 500, minWidth: 150, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}>
          {items.map(item => (
            <button key={item.label} onMouseDown={e => { e.preventDefault(); item.action(); closeAll() }}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '6px 10px', textAlign: 'left', borderRadius: 4, fontSize: 13, ...item.style }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(196,168,130,0.12)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'fixed', left: x, top: y, zIndex: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.7)', userSelect: 'none' as const }}>
      {dd(editor.getAttributes('textStyle').fontFamily?.split(',')[0]?.replace(/"/g,'') || 'Font', showFonts, () => setShowFonts(f => !f), FONTS.map(f => ({ label: f, action: () => editor.chain().focus().setFontFamily(f).run(), style: { fontFamily: f } })))}
      {sep()}
      {dd((editor.getAttributes('textStyle').fontSize?.replace('px','') || '—') + 'px', showSizes, () => setShowSizes(s => !s), SIZES.map(s => ({ label: s + 'px', action: () => editor.chain().focus().setMark('textStyle', { fontSize: s + 'px' }).run() })))}
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
      {btn('≡L', () => editor.chain().focus().setTextAlign('left').run(),    editor.isActive({ textAlign: 'left' }),    'Left')}
      {btn('≡C', () => editor.chain().focus().setTextAlign('center').run(),  editor.isActive({ textAlign: 'center' }),  'Center')}
      {btn('≡R', () => editor.chain().focus().setTextAlign('right').run(),   editor.isActive({ textAlign: 'right' }),   'Right')}
      {btn('≡J', () => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), 'Justify')}
      {sep()}
      {dd('🎨', showColors, () => setShowColors(c => !c), COLORS.map(c => ({ label: c, action: () => editor.chain().focus().setColor(c).run(), style: { color: c } })))}
      {sep()}
      {sep()}
      {btn('x²', () => editor.chain().focus().toggleSuperscript().run(), editor.isActive('superscript'), 'Superscript')}
      {btn('x₂', () => editor.chain().focus().toggleSubscript().run(),   editor.isActive('subscript'),   'Subscript')}
      {sep()}
      {btn('✕', () => editor.chain().focus().unsetAllMarks().run(), false, 'Clear')}
      {sep()}
      <button
        data-comment-trigger
        onMouseDown={e => { e.preventDefault(); onTriggerComment() }}
        title="Add comment (Ctrl+M)"
        style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px 7px', borderRadius: 3, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap', flexShrink: 0 }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--text)'}
      >⌥ Comment</button>
    </div>
  )
}
