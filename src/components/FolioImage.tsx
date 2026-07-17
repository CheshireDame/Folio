import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState, useRef, useEffect } from 'react'

// Image node view component
function ImageView({ node, updateAttributes, deleteNode }: any) {
  const { src, alt, width, layout } = node.attrs
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarRect, setToolbarRect] = useState<DOMRect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)

  const isFree = layout === 'free'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as HTMLElement)) {
        setShowToolbar(false)
        setToolbarRect(null)
      }
    }
    const onScroll = () => {
      if (showToolbar && wrapRef.current) {
        setToolbarRect(wrapRef.current.getBoundingClientRect())
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [showToolbar])

  const handleDragStart = (e: React.MouseEvent) => {
    if (!isFree) return
    setDragging(true)
    setStartDrag({ x: e.clientX, y: e.clientY })
    setStartPos({ x: dragPos.x, y: dragPos.y })
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      setDragPos({
        x: startPos.x + e.clientX - startDrag.x,
        y: startPos.y + e.clientY - startDrag.y,
      })
    }
    const onUp = () => setDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging, startPos, startDrag])

  const setLayout = (l: string) => {
    updateAttributes({ layout: l })
    if (l !== 'free') setDragPos({ x: 0, y: 0 })
    setShowToolbar(false)
  }

  const setWidth = (w: string) => updateAttributes({ width: w })

  const btn = (label: string, action: () => void, active = false, title = '') => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); action() }}
      title={title || label}
      style={{
        background: active ? 'rgba(196,168,130,0.25)' : 'none',
        border: 'none', color: active ? 'var(--accent)' : 'var(--text)',
        cursor: 'pointer', padding: '3px 7px', borderRadius: 3,
        fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
        whiteSpace: 'nowrap' as const, flexShrink: 0,
      }}
    >{label}</button>
  )

  const sep = () => <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />

  const lbl = (t: string) => (
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '0 3px', flexShrink: 0 }}>{t}</span>
  )

  const wrapStyle: React.CSSProperties = isFree ? {
    position: 'absolute',
    left: dragPos.x || 20,
    top: dragPos.y || 20,
    width: width || '200px',
    zIndex: 10,
    cursor: dragging ? 'grabbing' : 'grab',
  } : layout === 'left' ? {
    float: 'left',
    width: width || '40%',
    margin: '0.3em 1.2em 0.6em 0',
    clear: 'none',
  } : layout === 'right' ? {
    float: 'right',
    width: width || '40%',
    margin: '0.3em 0 0.6em 1.2em',
    clear: 'none',
  } : {
    display: 'block',
    width: width || '100%',
    margin: '1em auto',
    textAlign: 'center' as const,
  }

  return (
    <NodeViewWrapper
      as={layout === 'inline' ? 'span' : 'div'}
      style={{ display: layout === 'inline' ? 'inline' : 'block', position: layout === 'free' ? 'relative' : 'initial' }}
    >
      <div
        ref={wrapRef}
        style={wrapStyle}
        onClick={() => {
          const rect = wrapRef.current?.getBoundingClientRect() ?? null
          setToolbarRect(rect)
          setShowToolbar(true)
        }}
        onMouseDown={isFree ? handleDragStart : undefined}
      >
        <img
          src={src}
          alt={alt || ''}
          style={{ width: '100%', maxWidth: '100%', borderRadius: 4, display: 'block', outline: showToolbar ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }}
          draggable={false}
        />

        {showToolbar && toolbarRect && (
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.max(8, Math.min(toolbarRect.left + toolbarRect.width / 2 - 240, window.innerWidth - 488)),
              top: Math.max(8, toolbarRect.top - 46),
              zIndex: 1000,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '4px 6px',
              display: 'flex', alignItems: 'center', gap: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {lbl('Layout')}
            {btn('Block',  () => setLayout('block'),  layout === 'block' || !layout, 'Centered block')}
            {btn('Left',   () => setLayout('left'),   layout === 'left',  'Float left')}
            {btn('Right',  () => setLayout('right'),  layout === 'right', 'Float right')}
{btn('Free',   () => setLayout('free'),   layout === 'free',  'Free float — drag anywhere')}
            {sep()}
            {lbl('Size')}
            {btn('25%',  () => setWidth('25%'))}
            {btn('40%',  () => setWidth('40%'))}
            {btn('60%',  () => setWidth('60%'))}
            {btn('80%',  () => setWidth('80%'))}
            {btn('Full', () => setWidth('100%'))}
            {sep()}
            {btn('✕', () => { deleteNode(); setShowToolbar(false) }, false, 'Remove')}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// Custom Image extension with NodeView
export const FolioImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      src:    { default: null },
      alt:    { default: null },
      width:  { default: '100%' },
      layout: { default: 'block' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})
