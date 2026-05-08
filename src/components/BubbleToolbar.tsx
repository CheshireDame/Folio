import { Editor } from '@tiptap/react'
import { useState, useEffect, useRef } from 'react'

interface BubbleToolbarProps {
  editor: Editor | null
}

const FONTS = ['Crimson Pro','Playfair Display','JetBrains Mono','Georgia','Arial','Times New Roman']
const COLORS = ['#e8e2d9','#c4a882','#d4a0a0','#90b090','#90a8c0','#b0a0d0','#ffffff','#aaaaaa','#666666','#333333']
const SIZES = [12,14,16,18,20,22,24,28,32,36,48]

export default function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [showFonts, setShowFonts] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showSizes, setShowSizes] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return
    const update = () => {
      const { selection } = editor.state
      const { from, to } = selection
      // Don't show for image node selections
      if ('node' in selection && (selection as any).node?.type.name === 'image') {
        setVisible(false); return
      }
      if (from === to) { setVisible(false); return }
      const coords = editor.view.coordsAtPos(from)
      setPos({ x: coords.left, y: coords.top })
      setVisible(true)
    }
    editor.on('selectionUpdate', update)
    return () => { editor.off('selectionUpdate', update) }
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

  const tbW = 500
  const x = Math.max(8, Math.min(pos.x - tbW/2, window.innerWidth - tbW - 8))
  const y = pos.y - 52

  const btn = (label: string, action: () => void, active = false, title = '') => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); action() }}
      title={title}
      style={{
        background: active ? 'rgba(196,168,130,0.25)' : 'none',
        border: 'none', color: active ? '#c4a882' : '#e8e2d9',
        cursor: 'pointer', padding: '4px 7px', borderRadius: 3,
        fontSize: 12, fontFamily: '"JetBrains Mono", monospace',
        whiteSpace: 'nowrap' as const, flexShrink: 0,
      }}
    >{label}</button>
  )

  const sep = () => <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px', flexShrink: 0 }} />

  const dd = (label: string, open: boolean, toggle: () => void, items: {label:string,action:()=>void,style?:React.CSSProperties}[]) => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onMouseDown={e=>{e.preventDefault();toggle()}} style={{ background: open?'rgba(196,168,130,0.2)':'none', border:'none', color:'#e8e2d9', cursor:'pointer', padding:'4px 7px', borderRadius:3, fontSize:11, fontFamily:'"JetBrains Mono",monospace', display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap' as const }}>
        {label} <span style={{fontSize:7,opacity:0.5}}>▼</span>
      </button>
      {open && (
        <div style={{ position:'fixed', top: y+52, left: Math.max(8,pos.x-70), background:'#1a1814', border:'1px solid #3a3630', borderRadius:6, padding:4, zIndex:500, minWidth:150, maxHeight:200, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.7)' }}>
          {items.map(item => (
            <button key={item.label} onMouseDown={e=>{e.preventDefault();item.action();toggle()}}
              style={{ display:'block', width:'100%', background:'none', border:'none', color:'#e8e2d9', cursor:'pointer', padding:'6px 10px', textAlign:'left', borderRadius:4, fontSize:13, ...item.style }}
              onMouseOver={e=>e.currentTarget.style.background='rgba(196,168,130,0.12)'}
              onMouseOut={e=>e.currentTarget.style.background='none'}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div ref={ref} style={{ position:'fixed', left:x, top:y, zIndex:400, background:'#1a1814', border:'1px solid #3a3630', borderRadius:8, padding:'4px 6px', display:'flex', alignItems:'center', gap:2, boxShadow:'0 4px 20px rgba(0,0,0,0.7)', userSelect:'none' as const }}>
      {dd(editor.getAttributes('textStyle').fontFamily?.split(',')[0]?.replace(/"/g,'')||'Font', showFonts, ()=>{setShowFonts(f=>!f);setShowColors(false);setShowSizes(false)}, FONTS.map(f=>({label:f,action:()=>editor.chain().focus().setFontFamily(f).run(),style:{fontFamily:f}})))}
      {sep()}
      {dd((editor.getAttributes('textStyle').fontSize?.replace('px','')||'—')+'px', showSizes, ()=>{setShowSizes(s=>!s);setShowFonts(false);setShowColors(false)}, SIZES.map(s=>({label:s+'px',action:()=>editor.chain().focus().setMark('textStyle',{fontSize:s+'px'}).run()})))}
      {sep()}
      {btn('B',  ()=>editor.chain().focus().toggleBold().run(),      editor.isActive('bold'),      'Bold')}
      {btn('I',  ()=>editor.chain().focus().toggleItalic().run(),    editor.isActive('italic'),    'Italic')}
      {btn('U',  ()=>editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline')}
      {btn('S',  ()=>editor.chain().focus().toggleStrike().run(),    editor.isActive('strike'),    'Strikethrough')}
      {sep()}
      {btn('H1', ()=>editor.chain().focus().toggleHeading({level:1}).run(), editor.isActive('heading',{level:1}))}
      {btn('H2', ()=>editor.chain().focus().toggleHeading({level:2}).run(), editor.isActive('heading',{level:2}))}
      {btn('H3', ()=>editor.chain().focus().toggleHeading({level:3}).run(), editor.isActive('heading',{level:3}))}
      {sep()}
      {btn('≡L', ()=>editor.chain().focus().setTextAlign('left').run(),   editor.isActive({textAlign:'left'}),   'Left')}
      {btn('≡C', ()=>editor.chain().focus().setTextAlign('center').run(), editor.isActive({textAlign:'center'}), 'Center')}
      {btn('≡R', ()=>editor.chain().focus().setTextAlign('right').run(),  editor.isActive({textAlign:'right'}),  'Right')}
      {sep()}
      {dd('🎨', showColors, ()=>{setShowColors(c=>!c);setShowFonts(false);setShowSizes(false)}, COLORS.map(c=>({label:c,action:()=>editor.chain().focus().setColor(c).run(),style:{color:c}})))}
      {sep()}
      {btn('✕', ()=>editor.chain().focus().unsetAllMarks().run(), false, 'Clear')}
    </div>
  )
}
