import { Editor } from '@tiptap/react'
import { useRef } from 'react'

interface SelectedImg {
  el: HTMLImageElement
  x: number
  y: number
}

interface ImageToolbarProps {
  editor: Editor | null
  selectedImg: SelectedImg | null
  onClose: () => void
}

export default function ImageToolbar({ editor, selectedImg, onClose }: ImageToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)

  if (!selectedImg || !editor) return null

  const { el: imgEl, x: centerX, y: imgTop } = selectedImg
  const tbW = 480
  const x = Math.max(8, Math.min(centerX - tbW / 2, window.innerWidth - tbW - 8))
  const y = Math.max(8, imgTop - 52)

  const setWidth = (w: string) => {
    imgEl.style.width = w
    imgEl.style.maxWidth = '100%'
  }

  const setLayout = (mode: string) => {
    imgEl.style.cssFloat      = 'none'
    imgEl.style.display       = 'block'
    imgEl.style.margin        = '1em auto'
    imgEl.style.verticalAlign = 'baseline'
    if (mode === 'left') {
      imgEl.style.cssFloat = 'left'
      imgEl.style.margin   = '0.3em 1.2em 0.6em 0'
    } else if (mode === 'right') {
      imgEl.style.cssFloat = 'right'
      imgEl.style.margin   = '0.3em 0 0.6em 1.2em'
    } else if (mode === 'inline') {
      imgEl.style.display       = 'inline'
      imgEl.style.verticalAlign = 'middle'
      imgEl.style.margin        = '0 0.3em'
    }
    onClose()
  }

  const btn = (label: string, action: () => void, active = false, title = '') => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); action() }}
      title={title || label}
      style={{
        background: active ? 'rgba(196,168,130,0.25)' : 'none',
        border: 'none', color: active ? '#c4a882' : '#e8e2d9',
        cursor: 'pointer', padding: '4px 8px', borderRadius: 3,
        fontSize: 11, fontFamily: '"JetBrains Mono", monospace',
        whiteSpace: 'nowrap' as const, flexShrink: 0,
      }}
      onMouseOver={e => { if (!active) e.currentTarget.style.color = 'white' }}
      onMouseOut={e => { if (!active) e.currentTarget.style.color = '#e8e2d9' }}
    >{label}</button>
  )

  const sep = () => (
    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 3px', flexShrink: 0 }} />
  )

  const lbl = (text: string) => (
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: '#6b6058', textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '0 4px', flexShrink: 0 }}>
      {text}
    </span>
  )

  const isLeft   = imgEl.style.cssFloat === 'left'
  const isRight  = imgEl.style.cssFloat === 'right'
  const isInline = imgEl.style.display === 'inline'
  const isBlock  = !isLeft && !isRight && !isInline

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left: x, top: y, zIndex: 500,
        background: '#1a1814', border: '1px solid #3a3630',
        borderRadius: 8, padding: '5px 8px',
        display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
        userSelect: 'none' as const,
      }}
    >
      {lbl('Layout')}
      {btn('Block',  () => setLayout('block'),  isBlock,  'Centered block')}
      {btn('Left',   () => setLayout('left'),   isLeft,   'Float left')}
      {btn('Right',  () => setLayout('right'),  isRight,  'Float right')}
      {btn('Inline', () => setLayout('inline'), isInline, 'Inline with text')}
      {sep()}
      {lbl('Size')}
      {btn('25%',  () => setWidth('25%'))}
      {btn('40%',  () => setWidth('40%'))}
      {btn('60%',  () => setWidth('60%'))}
      {btn('80%',  () => setWidth('80%'))}
      {btn('Full', () => setWidth('100%'))}
      {sep()}
      {btn('✕', () => {
        try {
          const view = editor.view
          const pos = view.posAtDOM(imgEl, 0)
          if (pos >= 0) editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run()
        } catch(e) {}
        onClose()
      }, false, 'Remove')}
    </div>
  )
}
