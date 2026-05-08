import { useState } from 'react'
import { Editor } from '@tiptap/react'
import CommentSystem from './CommentSystem'
import type { NoteSection, Comment } from '../lib/storage'

interface Draft { content: string; savedAt?: string }

interface SidePanelProps {
  open: boolean
  activeTab: 'notes' | 'comments' | 'drafts'
  notesSections: NoteSection[]
  comments: Comment[]
  drafts: Record<string, Draft>
  currentDraft: string
  editor: Editor | null
  onTabChange: (t: 'notes' | 'comments' | 'drafts') => void
  onNotesSectionsChange: (s: NoteSection[]) => void
  onCommentsChange: (c: Comment[]) => void
  onLoadDraft: (name: string) => void
  onNewDraft: () => void
  onDeleteDraft: (name: string) => void
}

export default function SidePanel({
  open, activeTab, notesSections, comments, drafts, currentDraft, editor,
  onTabChange, onNotesSectionsChange, onCommentsChange,
  onLoadDraft, onNewDraft, onDeleteDraft,
}: SidePanelProps) {
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)

  if (!open) return null

  const addSection = () => {
    const s: NoteSection = { id: Date.now().toString(), title: 'New section', content: '' }
    onNotesSectionsChange([...notesSections, s])
    setEditingTitleId(s.id)
  }

  const updateSection = (id: string, patch: Partial<NoteSection>) =>
    onNotesSectionsChange(notesSections.map(s => s.id === id ? { ...s, ...patch } : s))

  const deleteSection = (id: string) =>
    onNotesSectionsChange(notesSections.filter(s => s.id !== id))

  const tabs = ['notes', 'comments', 'drafts'] as const

  return (
    <div style={{ width: 300, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => onTabChange(tab)}
            style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── Notes tab ── */}
        {activeTab === 'notes' && (
          <div>
            {notesSections.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 32, lineHeight: 1.8 }}>
                No sections yet.
              </div>
            )}
            {notesSections.map(s => (
              <div key={s.id} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: s.minimized ? 'none' : '1px solid var(--border)' }}>
                  <button onClick={() => updateSection(s.id, { minimized: !s.minimized })}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0 3px 0 0', fontSize: 9, flexShrink: 0, lineHeight: 1 }}
                    title={s.minimized ? 'Expand' : 'Collapse'}>
                    {s.minimized ? '▸' : '▾'}
                  </button>
                  {editingTitleId === s.id ? (
                    <input
                      autoFocus
                      value={s.title}
                      onChange={e => updateSection(s.id, { title: e.target.value })}
                      onBlur={() => setEditingTitleId(null)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitleId(null) }}
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text)', letterSpacing: '0.04em' }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingTitleId(s.id)}
                      title="Click to rename"
                      style={{ flex: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text2)', cursor: 'text', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title || 'Untitled'}
                    </span>
                  )}
                  <button onClick={() => deleteSection(s.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '1px 4px', borderRadius: 3, fontSize: 11, flexShrink: 0, opacity: 0.5 }}
                    onMouseOver={e => { e.currentTarget.style.color = '#e24b4a'; e.currentTarget.style.opacity = '1' }}
                    onMouseOut={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.opacity = '0.5' }}
                    title="Delete section">✕</button>
                </div>
                {/* Section body */}
                {!s.minimized && (
                  <textarea
                    value={s.content}
                    onChange={e => updateSection(s.id, { content: e.target.value })}
                    placeholder="Write here…"
                    style={{ display: 'block', width: '100%', minHeight: 100, background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', padding: '10px 12px', fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
            <button onClick={addSection}
              style={{ width: '100%', padding: '8px 0', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
            >+ New section</button>
          </div>
        )}

        {/* ── Comments tab ── */}
        {activeTab === 'comments' && (
          <div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', marginBottom: 12, letterSpacing: '0.06em' }}>
              Select text + Ctrl+M to add a comment
            </div>
            <CommentSystem
              editor={editor}
              comments={comments}
              onCommentsChange={onCommentsChange}
              triggerComment={false}
              onTriggerHandled={() => {}}
            />
          </div>
        )}

        {/* ── Drafts tab ── */}
        {activeTab === 'drafts' && (
          <div>
            {Object.entries(drafts).map(([name, draft]) => {
              const isCurrent = name === currentDraft
              const words = draft.content ? draft.content.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length : 0
              return (
                <div key={name} onClick={() => !isCurrent && onLoadDraft(name)}
                  style={{ padding: '10px 12px', marginBottom: 8, background: isCurrent ? 'rgba(196,168,130,0.06)' : 'transparent', border: '1px solid var(--border)', borderLeft: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, cursor: isCurrent ? 'default' : 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontStyle: isCurrent ? 'italic' : 'normal' }}>{name}{isCurrent ? ' ✶' : ''}</span>
                    {!isCurrent && (
                      <button onClick={e => { e.stopPropagation(); onDeleteDraft(name) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '1px 4px', borderRadius: 3 }}
                        onMouseOver={e => e.currentTarget.style.color = '#e24b4a'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}>✕</button>
                    )}
                  </div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)' }}>{words} words · {draft.savedAt ? new Date(draft.savedAt).toLocaleDateString() : 'unsaved'}</div>
                </div>
              )
            })}
            <button onClick={onNewDraft}
              style={{ width: '100%', marginTop: 8, padding: 8, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              + New Draft
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
