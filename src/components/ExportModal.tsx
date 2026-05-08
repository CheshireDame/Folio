import { exportDraft } from '../lib/export'
import { useState } from 'react'

interface ExportModalProps {
  open: boolean
  html: string
  draftName: string
  onClose: () => void
}

export default function ExportModal({ open, html, draftName, onClose }: ExportModalProps) {
  const [selected, setSelected] = useState<'txt' | 'md' | 'html' | 'rtf'>('rtf')
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  const formats = [
    { id: 'rtf'  as const, label: 'Rich Text (RTF)', ext: '.rtf',  desc: 'Opens in Word, Google Docs, Pages. Preserves bold, italic, headings.' },
    { id: 'txt'  as const, label: 'Plain Text',      ext: '.txt',  desc: 'Clean text only. Universal.' },
    { id: 'md'   as const, label: 'Markdown',        ext: '.md',   desc: 'Structured text for Obsidian, Notion, GitHub.' },
    { id: 'html' as const, label: 'Full HTML',       ext: '.html', desc: 'Preserves images and styling. Opens in any browser.' },
  ]

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportDraft(html, draftName, selected)
      setDone(true)
      setTimeout(() => { setDone(false); onClose() }, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 440 }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, color: 'var(--accent)', fontStyle: 'italic', marginBottom: 6 }}>Export Draft</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)', marginBottom: 24 }}>{draftName}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {formats.map(f => (
            <div key={f.id} onClick={() => setSelected(f.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 14px', background: selected === f.id ? 'rgba(196,168,130,0.06)' : 'transparent', border: '1px solid ' + (selected === f.id ? 'var(--accent)' : 'var(--border)'), borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: selected === f.id ? 'rgba(196,168,130,0.15)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: selected === f.id ? 'var(--accent)' : 'var(--text3)', letterSpacing: '0.05em' }}>
                {f.ext}
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em', marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {done && (
          <div style={{ textAlign: 'center', color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, marginBottom: 14, letterSpacing: '0.06em' }}>
            ✦ Exported successfully
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Cancel</button>
          <button onClick={handleExport} disabled={exporting} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 6, cursor: exporting ? 'wait' : 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
