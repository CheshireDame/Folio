import { useEffect, useState, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { Mark, mergeAttributes } from '@tiptap/core'
import type { Comment } from '../lib/storage'

// Custom Tiptap mark for comments
export const CommentMark = Mark.create({
  name: 'comment',
  addAttributes() {
    return {
      commentId: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-comment-id': HTMLAttributes.commentId,
      style: 'background:rgba(196,168,130,0.15);border-bottom:1px solid var(--accent);cursor:pointer;',
    }), 0]
  },
})

interface CommentPopupProps {
  x: number
  y: number
  onSave: (text: string) => void
  onCancel: () => void
}

function CommentPopup({ x, y, onSave, onCancel }: CommentPopupProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSave(text.trim()) }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(x, window.innerWidth - 280),
      top: y + 8,
      width: 260,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '2px solid var(--accent)',
      borderRadius: 8,
      padding: 12,
      zIndex: 300,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.08em' }}>
        COMMENT
      </div>
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Add a note about this passage..."
        style={{
          width: '100%', background: 'transparent', border: 'none',
          outline: 'none', resize: 'none', fontFamily: '"Crimson Pro", Georgia, serif',
          fontSize: 13, color: 'var(--text)', lineHeight: 1.6, minHeight: 60,
        }}
      />
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', marginTop: 8, letterSpacing: '0.05em' }}>
        Enter to save · Esc to cancel
      </div>
    </div>
  )
}

interface CommentCardProps {
  comment: Comment
  onDelete: (id: string) => void
  onScrollTo: (id: string) => void
}

function CommentCard({ comment, onDelete, onScrollTo }: CommentCardProps) {
  return (
    <div
      onClick={() => onScrollTo(comment.id)}
      style={{
        background: 'rgba(196,168,130,0.05)',
        border: '1px solid var(--border)',
        borderLeft: '2px solid var(--accent)',
        borderRadius: 6, padding: '10px 12px',
        marginBottom: 10, cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseOver={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseOut={e => e.currentTarget.style.background = 'rgba(196,168,130,0.05)'}
    >
      {!comment.anchored && (
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Free note
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 8 }}>
        {comment.text}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(comment.id) }}
        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', padding: '2px 8px', borderRadius: 3, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}
        onMouseOver={e => { e.currentTarget.style.color = '#e24b4a'; e.currentTarget.style.borderColor = '#e24b4a' }}
        onMouseOut={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        Delete
      </button>
    </div>
  )
}

interface CommentSystemProps {
  popupOnly?: boolean
  editor: Editor | null
  comments: Comment[]
  onCommentsChange: (c: Comment[]) => void
  triggerComment: boolean
  onTriggerHandled: () => void
}

export default function CommentSystem({ editor, comments, onCommentsChange, triggerComment, onTriggerHandled, popupOnly }: CommentSystemProps) {
  const [popup, setPopup] = useState<{ x: number; y: number; range: any } | null>(null)
  const savedRangeRef = useRef<{ from: number; to: number } | null>(null)

  // Save selection before button click steals focus
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-comment-trigger]')) {
        if (!editor) return
        const { from, to } = editor.state.selection
        if (from !== to) {
          savedRangeRef.current = { from, to }
        } else {
          savedRangeRef.current = null
        }
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [editor])

  // Ctrl+M keyboard shortcut — capture selection synchronously (popupOnly instance only)
  useEffect(() => {
    if (!popupOnly) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === 'm')) return
      e.preventDefault()
      if (!editor) return
      const { from, to } = editor.state.selection
      if (from !== to) {
        const coords = editor.view.coordsAtPos(from)
        setPopup({ x: coords.left, y: coords.bottom, range: { from, to } })
      } else {
        const wrap = document.querySelector('.folio-editor-wrap') as HTMLElement
        const rect = wrap?.getBoundingClientRect() ?? { left: window.innerWidth / 2 - 130, top: 100 }
        setPopup({ x: (rect as DOMRect).left + 20, y: (rect as DOMRect).top + 80, range: null })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editor, popupOnly])

  // Handle comment trigger from button click
  useEffect(() => {
    if (!triggerComment || !editor) return
    onTriggerHandled()

    const range = savedRangeRef.current
    const { from, to } = editor.state.selection
    const hasSelection = range ? range.from !== range.to : from !== to

    if (hasSelection) {
      const coords = editor.view.coordsAtPos(range ? range.from : from)
      setPopup({ x: coords.left, y: coords.bottom, range: range || { from, to } })
    } else {
      const wrap = document.querySelector('.folio-editor-wrap') as HTMLElement
      const rect = wrap?.getBoundingClientRect() ?? { left: window.innerWidth / 2 - 130, top: 100 }
      setPopup({ x: rect.left + 20, y: (rect as DOMRect).top + 80, range: null })
    }
  }, [triggerComment])

  const saveComment = (text: string) => {
    if (!editor || !popup) return
    const id = 'c' + Date.now()

    if (popup.range) {
      const { from, to } = popup.range
      editor.chain().focus().setTextSelection({ from, to })
        .setMark('comment', { commentId: id })
        .run()
      onCommentsChange([...comments, { id, text, anchored: true }])
    } else {
      onCommentsChange([...comments, { id, text, anchored: false }])
    }
    setPopup(null)
    savedRangeRef.current = null
  }

  const deleteComment = (id: string) => {
    onCommentsChange(comments.filter(c => c.id !== id))
    // Remove mark from editor
    if (editor) {
      const { doc } = editor.state
      editor.view.dispatch(
        editor.state.tr.removeMark(0, doc.content.size,
          editor.schema.marks.comment)
      )
    }
  }

  const scrollToComment = (id: string) => {
    const el = document.querySelector(`[data-comment-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <>
      {popup && (
        <CommentPopup
          x={popup.x}
          y={popup.y}
          onSave={saveComment}
          onCancel={() => { setPopup(null); savedRangeRef.current = null }}
        />
      )}
      {!popupOnly && (comments.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 40, lineHeight: 1.8 }}>
          No comments yet.<br />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text2)' }}>
            Select text + Ctrl+M
          </span>
        </div>
      ) : (
        comments.map(c => (
          <CommentCard key={c.id} comment={c} onDelete={deleteComment} onScrollTo={scrollToComment} />
        ))
      ))}

    </>
  )
}