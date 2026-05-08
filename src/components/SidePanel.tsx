import { Editor } from '@tiptap/react'
import CommentSystem from './CommentSystem'

interface Draft { content: string; savedAt?: string }
interface Comment { id: string; text: string; anchored: boolean }

interface SidePanelProps {
  open: boolean
  activeTab: 'notes' | 'comments' | 'drafts'
  notes: string
  drafts: Record<string, Draft>
  currentDraft: string
  comments: Comment[]
  editor: Editor | null
  onTabChange: (t: 'notes' | 'comments' | 'drafts') => void
  onNotesChange: (s: string) => void
  onLoadDraft: (name: string) => void
  onNewDraft: () => void
  onDeleteDraft: (name: string) => void
  onCommentsChange: (c: Comment[]) => void
}

export default function SidePanel({ open, activeTab, notes, drafts, currentDraft, comments, editor, onTabChange, onNotesChange, onLoadDraft, onNewDraft, onDeleteDraft, onCommentsChange }: SidePanelProps) {
  if (!open) return null
  const tabs = ['notes', 'comments', 'drafts'] as const
  return (
    <div style={{ width: 300, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => onTabChange(tab)} style={{ flex: 1, padding: '10px 6px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'notes' && (
          <>
            <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 12, color: 'var(--text3)', marginBottom: 12, fontStyle: 'italic' }}>Drafting notes & references</div>
            <textarea value={notes} onChange={e => onNotesChange(e.target.value)} placeholder="Jot down ideas, outlines, references..." style={{ width: '100%', minHeight: 300, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }} />
          </>
        )}
        {activeTab === 'comments' && (
          <CommentSystem editor={editor} comments={comments} onCommentsChange={onCommentsChange} triggerComment={false} onTriggerHandled={() => {}} />
        )}
        {activeTab === 'drafts' && (
          <div>
            {Object.entries(drafts).map(([name, draft]) => {
              const isCurrent = name === currentDraft
              const words = draft.content ? draft.content.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length : 0
              return (
                <div key={name} onClick={() => !isCurrent && onLoadDraft(name)} style={{ padding: '10px 12px', marginBottom: 8, background: isCurrent ? 'rgba(196,168,130,0.06)' : 'transparent', border: '1px solid var(--border)', borderLeft: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, cursor: isCurrent ? 'default' : 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontStyle: isCurrent ? 'italic' : 'normal' }}>{name}{isCurrent ? ' ✶' : ''}</span>
                    {!isCurrent && (
                      <button onClick={e => { e.stopPropagation(); onDeleteDraft(name) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '1px 4px', borderRadius: 3 }} onMouseOver={e => e.currentTarget.style.color = '#e24b4a'} onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}>✕</button>
                    )}
                  </div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)' }}>{words} words · {draft.savedAt ? new Date(draft.savedAt).toLocaleDateString() : 'unsaved'}</div>
                </div>
              )
            })}
            <button onClick={onNewDraft} style={{ width: '100%', marginTop: 8, padding: 8, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>+ New Draft</button>
          </div>
        )}
      </div>
    </div>
  )
}