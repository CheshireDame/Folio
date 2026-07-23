import { useEffect, useRef, useState } from 'react'
import type { Block } from '../lib/storage'

const STAGE_FONTS = [
  { label: 'Crimson Pro',     value: '"Crimson Pro", Georgia, serif' },
  { label: 'Playfair Display', value: '"Playfair Display", Georgia, serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Arial',           value: 'Arial, sans-serif' },
]

interface Props {
  blocks: Block[]
  stageFont: string
  onChange: (blocks: Block[]) => void
  onFontChange: (font: string) => void
  onBuildDocument: () => void
}

export default function BlockEditor({ blocks, stageFont, onChange, onFontChange, onBuildDocument }: Props) {
  const blocksRef   = useRef(blocks)
  const dragRef     = useRef<{ id: string; startY: number; origIndex: number } | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => { blocksRef.current = blocks }, [blocks])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const cards = document.querySelectorAll<HTMLElement>('[data-block-card]')
      let target = d.origIndex
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect()
        if (e.clientY > rect.top + rect.height / 2) target = i + 1
      })
      setDragOver(target)
    }
    const onUp = () => {
      const d = dragRef.current
      if (d && dragOver !== null && dragOver !== d.origIndex && dragOver !== d.origIndex + 1) {
        const cur = blocksRef.current
        const moving = cur[d.origIndex]
        const rest   = cur.filter((_, i) => i !== d.origIndex)
        const insertAt = dragOver > d.origIndex ? dragOver - 1 : dragOver
        const next = [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)]
        onChange(next)
      }
      dragRef.current = null
      setDragOver(null)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [onChange, dragOver])

  const update = (id: string, patch: Partial<Block>) =>
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b))

  const remove = (id: string) => onChange(blocks.filter(b => b.id !== id))

  const addBlock = () => onChange([...blocks, { id: Date.now().toString(), content: '' }])

  const hlBtn = (b: Block, level: 1 | 2 | 3 | undefined, label: string) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); update(b.id, { headingLevel: level }) }}
      style={{
        background: b.headingLevel === level ? 'rgba(196,168,130,0.25)' : 'none',
        border: 'none', color: b.headingLevel === level ? 'var(--accent)' : 'var(--text3)',
        cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}
    >{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Block list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            No blocks yet — convert from Stage 1 or add one below
          </div>
        )}

        {blocks.map((block, index) => (
          <div key={block.id}>
            {dragOver === index && (
              <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, marginBottom: 4, opacity: 0.7 }} />
            )}
            <div
              data-block-card
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px',
                opacity: dragRef.current?.id === block.id ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {/* Drag handle */}
              <div
                onMouseDown={e => {
                  e.preventDefault()
                  dragRef.current = { id: block.id, startY: e.clientY, origIndex: index }
                }}
                style={{ cursor: 'grab', color: 'var(--text3)', padding: '4px 2px', fontSize: 13, flexShrink: 0, lineHeight: 1.2, marginTop: 2 }}
              >≡</div>

              {/* Content area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Heading toggles */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {hlBtn(block, undefined, 'P')}
                  {hlBtn(block, 1, 'H1')}
                  {hlBtn(block, 2, 'H2')}
                  {hlBtn(block, 3, 'H3')}
                </div>

                <textarea
                  value={block.content}
                  onChange={e => update(block.id, { content: e.target.value })}
                  placeholder={block.headingLevel ? `Heading ${block.headingLevel}…` : 'Paragraph…'}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    resize: 'none', width: '100%',
                    fontFamily: block.headingLevel
                      ? '"Playfair Display", Georgia, serif'
                      : (stageFont || '"Crimson Pro", Georgia, serif'),
                    fontSize: block.headingLevel === 1 ? 22 : block.headingLevel === 2 ? 18 : block.headingLevel === 3 ? 15 : 14,
                    fontWeight: block.headingLevel ? 600 : 400,
                    color: 'var(--text)',
                    lineHeight: 1.55,
                    minHeight: 36,
                  }}
                  rows={block.headingLevel ? 1 : 3}
                />
              </div>

              {/* Delete */}
              <button
                onClick={() => remove(block.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '2px 4px', flexShrink: 0, lineHeight: 1, marginTop: 4 }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
              >✕</button>
            </div>
          </div>
        ))}

        {dragOver === blocks.length && (
          <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, opacity: 0.7 }} />
        )}
      </div>

      {/* Footer controls */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 32px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--toolbar)', flexShrink: 0 }}>
        {/* Font picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
            Stage 3 font
          </span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {STAGE_FONTS.map(f => (
              <button
                key={f.value}
                onClick={() => onFontChange(f.value)}
                style={{
                  background: stageFont === f.value ? 'rgba(196,168,130,0.2)' : 'none',
                  border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
                  color: stageFont === f.value ? 'var(--accent)' : 'var(--text3)',
                  padding: '3px 10px', fontFamily: f.value, fontSize: 12,
                }}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Add block + Build */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={addBlock}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 5, cursor: 'pointer', padding: '6px 14px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--text2)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >+ Add block</button>

          <button
            onClick={onBuildDocument}
            style={{ background: 'var(--accent)', border: 'none', color: 'var(--accent-text)', borderRadius: 5, cursor: 'pointer', padding: '6px 16px', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}
          >Build document →</button>
        </div>
      </div>
    </div>
  )
}
