import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { FolioImage } from './components/FolioImage'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { useState, useEffect, useRef, useCallback } from 'react'
import Toolbar from './components/Toolbar'
import StatsBar from './components/StatsBar'
import SettingsModal from './components/SettingsModal'
import SidePanel from './components/SidePanel'
import CommentSystem, { CommentMark } from './components/CommentSystem'
import BubbleToolbar from './components/BubbleToolbar'
import FormattingBar from './components/FormattingBar'
import { saveData, loadData } from './lib/storage'
import ExportModal from './components/ExportModal'
import './App.css'

const THEMES = [
  { name: 'Noir',   bg: '#1a1814', surface: '#211f1b', text: '#e8e2d9', text2: '#a09890', text3: '#6b6058', border: '#3a3630', toolbar: '#15130f', accent: '#c4a882' },
  { name: 'Ivory',  bg: '#f5f0e8', surface: '#ede8de', text: '#2a2520', text2: '#6b6058', text3: '#9b9088', border: '#d4cfc6', toolbar: '#e3ddd3', accent: '#8b6f47' },
  { name: 'Slate',  bg: '#1c2128', surface: '#22272e', text: '#cdd9e5', text2: '#8b949e', text3: '#6e7681', border: '#373e47', toolbar: '#161b22', accent: '#90a8c0' },
  { name: 'Forest', bg: '#1a1f1a', surface: '#1f261f', text: '#d4e4d4', text2: '#8aaa8a', text3: '#5a7a5a', border: '#2e3d2e', toolbar: '#151a15', accent: '#90b090' },
  { name: 'Dusk',   bg: '#1e1a26', surface: '#261f33', text: '#e4daf0', text2: '#9d8fb0', text3: '#6a5f7a', border: '#3a2f50', toolbar: '#17131f', accent: '#b0a0d0' },
]

interface Draft { content: string; savedAt?: string }
interface Comment { id: string; text: string; anchored: boolean }

function darken(hex: string, amt = 0.35): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return '#' + [r,g,b].map(v => Math.round(v*(1-amt)).toString(16).padStart(2,'0')).join('')
}

export default function App() {
  const [loaded, setLoaded]                 = useState(false)
  const [themeIdx, setThemeIdx]             = useState(0)
  const [accentColor, setAccentColor]       = useState('#c4a882')
  const [bgColor, setBgColor]               = useState('')
  const [bgImage, setBgImage]               = useState('')
  const [bgBlur, setBgBlur]                 = useState(0)
  const [bgDim, setBgDim]                   = useState(0)
 const [canvasBg, setCanvasBg]             = useState('transparent')
  const [canvasOpacity, setCanvasOpacity]   = useState(100)
  const [canvasBlur, setCanvasBlur]         = useState(0)
  const [shadowColor, setShadowColor]       = useState('#000000')
  const [shadowOpacity, setShadowOpacity]   = useState(0)
  const [shadowRange, setShadowRange]       = useState(20)
  const [fontSize, setFontSize]             = useState(20)
  const [editorWidth, setEditorWidth]       = useState(680)
  const [lineHeight, setLineHeight]         = useState(1.85)
  const [focusMode, setFocusMode]           = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [showSettings, setShowSettings]     = useState(false)
  const [showPanel, setShowPanel]           = useState(false)
  const [showExport, setShowExport]         = useState(false)
  const [showFormattingBar, setShowFormattingBar] = useState(true)
  const [panelTab, setPanelTab]             = useState<'notes'|'comments'|'drafts'>('notes')
  const [wordGoal, setWordGoal]             = useState(500)
  const [timer, setTimer]                   = useState(0)
  const [timerRunning, setTimerRunning]     = useState(false)
  const [drafts, setDrafts]                 = useState<Record<string, Draft>>({ untitled: { content: '', savedAt: new Date().toISOString() } })
  const [currentDraft, setCurrentDraft]     = useState('untitled')
  const [notes, setNotes]                   = useState('')
  const [comments, setComments]             = useState<Comment[]>([])
  const [triggerComment, setTriggerComment] = useState(false)
  const timerRef      = useRef<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const saveTimeout   = useRef<number | null>(null)
  const theme = THEMES[themeIdx]

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      FolioImage,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
      CharacterCount,
      CommentMark,
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: { attributes: { class: 'folio-editor' } },
  })

  // Load on startup
  useEffect(() => {
    loadData().then(data => {
      if (data) {
        setThemeIdx(data.settings.themeIdx ?? 0)
        setAccentColor(data.settings.accentColor ?? '#c4a882')
        setBgColor(data.settings.bgColor ?? '')
        setFontSize(data.settings.fontSize ?? 20)
        setEditorWidth(data.settings.editorWidth ?? 680)
        setLineHeight(data.settings.lineHeight ?? 1.85)
        setWordGoal(data.settings.wordGoal ?? 500)
        setTypewriterMode(data.settings.typewriterMode ?? false)
        setShowFormattingBar(data.settings.showFormattingBar ?? true)
        setDrafts(data.drafts ?? { untitled: { content: '', savedAt: new Date().toISOString() } })
        setCurrentDraft(data.currentDraft ?? 'untitled')
        setNotes(data.notes ?? '')
      }
      setLoaded(true)
    })
  }, [])

  // Load draft content into editor once both editor and data are ready
  useEffect(() => {
    if (!editor || !loaded) return
    const saved = drafts[currentDraft]
    if (saved?.content) editor.commands.setContent(saved.content)
  }, [editor, loaded])

  // Theme vars
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--bg',      bgColor || theme.bg)
    r.setProperty('--surface', theme.surface)
    r.setProperty('--text',    theme.text)
    r.setProperty('--text2',   theme.text2)
    r.setProperty('--text3',   theme.text3)
    r.setProperty('--border',  theme.border)
    r.setProperty('--toolbar', theme.toolbar)
    r.setProperty('--accent',  accentColor)
    r.setProperty('--accent2', darken(accentColor))
    // Background image
    const bgLayer = document.getElementById('folio-bg-layer')
    if (bgLayer) {
      if (bgImage) {
        bgLayer.style.backgroundImage = 'url(' + bgImage + ')'
        bgLayer.style.filter = 'blur(' + bgBlur + 'px)'
        bgLayer.style.opacity = '1'
      } else {
        bgLayer.style.backgroundImage = 'none'
        bgLayer.style.opacity = '0'
      }
    }
    const dimLayer = document.getElementById('folio-dim-layer')
    if (dimLayer) dimLayer.style.background = bgImage ? 'rgba(0,0,0,' + bgDim/100 + ')' : 'transparent'
  }, [themeIdx, accentColor, bgColor, bgImage, bgBlur, bgDim])

  // Font/line-height
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('style', `font-size:${fontSize}px;line-height:${lineHeight};`)
  }, [fontSize, lineHeight, editor])

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  // Auto-save debounced
  useEffect(() => {
    if (!loaded) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(() => {
      saveData({ drafts, currentDraft, notes, settings: { themeIdx, accentColor, bgColor, bgImage, bgBlur, bgDim,  fontSize, editorWidth, lineHeight, wordGoal, typewriterMode, showFormattingBar } })
    }, 1500)
  }, [drafts, currentDraft, notes, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal, typewriterMode, loaded])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setShowExport(true) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') { e.preventDefault(); setTriggerComment(true) }
      if (e.key === 'Escape') { setShowSettings(false); setShowExport(false); setFocusMode(false) }
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(f => !f) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const saveDraft = useCallback(() => {
    if (!editor) return
    const updated = { ...drafts, [currentDraft]: { content: editor.getHTML(), savedAt: new Date().toISOString() } }
    setDrafts(updated)
    saveData({ drafts: updated, currentDraft, notes, settings: { themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal, typewriterMode } })
  }, [editor, currentDraft, drafts, notes, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal, typewriterMode])

  const loadDraft = (name: string) => {
    saveDraft()
    setCurrentDraft(name)
    editor?.commands.setContent(drafts[name]?.content || '')
  }

  const newDraft = () => {
    const name = prompt('Draft name:')
    if (!name) return
    saveDraft()
    setDrafts(d => ({ ...d, [name]: { content: '', savedAt: new Date().toISOString() } }))
    setCurrentDraft(name)
    editor?.commands.clearContent()
  }

  const deleteDraft = (name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const remaining = Object.keys(drafts).filter(k => k !== name)
    setDrafts(d => { const n = {...d}; delete n[name]; return n })
    if (currentDraft === name) {
      if (remaining.length) loadDraft(remaining[remaining.length - 1])
      else { setCurrentDraft('untitled'); setDrafts({ untitled: { content: '', savedAt: new Date().toISOString() } }); editor?.commands.clearContent() }
    }
  }

const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { editor?.chain().focus().insertContent({
        type: 'image',
        attrs: { src: ev.target?.result as string, alt: file.name, width: '100%', layout: 'block' }
      }).run() }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const words = editor?.storage.characterCount.words() ?? 0
  const chars  = editor?.storage.characterCount.characters() ?? 0

  return (
    <div style={{ background: bgImage ? 'transparent' : 'var(--bg)', color: 'var(--text)', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '"Crimson Pro", Georgia, serif', transition: 'background 0.3s, color 0.3s', position: 'relative' }}>
      {/* Background image layers */}
      <div id="folio-bg-layer" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.05)', opacity: 0, transition: 'opacity 0.4s', pointerEvents: 'none' }} />
      <div id="folio-dim-layer" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', transition: 'background 0.3s' }} />
    <style>{`
  .folio-canvas-blur::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(${canvasBlur}px);
    -webkit-backdrop-filter: blur(${canvasBlur}px);
    z-index: -1;
  }
`}</style>
      <Toolbar
        currentDraft={currentDraft} focusMode={focusMode} timerRunning={timerRunning}
        onNew={newDraft} onSave={saveDraft} onExport={() => setShowExport(true)}
        onTogglePanel={() => setShowPanel(p => !p)}
        onToggleFocus={() => setFocusMode(f => !f)}
        onToggleTypewriter={() => setTypewriterMode(t => !t)}
        onToggleTimer={() => setTimerRunning(r => !r)}
        onOpenSettings={() => setShowSettings(true)}
        onComment={() => setTriggerComment(true)}
        onImage={() => imageInputRef.current?.click()}
        onToggleFormattingBar={() => setShowFormattingBar(f => !f)}
        showFormattingBar={showFormattingBar}
      />
      <FormattingBar editor={editor} visible={showFormattingBar} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="folio-editor-wrap" style={{ flex: 1, overflowY: 'auto', padding: typewriterMode ? '42vh 48px 60px' : '60px 48px', display: 'flex', justifyContent: 'center' }} onClick={() => focusMode && setFocusMode(false)}>
          <div className={canvasBlur > 0 ? 'folio-canvas-blur' : ''} style={{ width: '100%', maxWidth: editorWidth, position: 'relative', background: canvasBg === 'transparent' && canvasBlur > 0 ? 'rgba(0,0,0,0.01)' : canvasBg === 'transparent' ? 'transparent' : canvasBg, backdropFilter: canvasBlur > 0 ? 'blur(' + canvasBlur + 'px)' : undefined,
WebkitBackdropFilter: canvasBlur > 0 ? 'blur(' + canvasBlur + 'px)' : undefined, boxShadow: shadowOpacity > 0 ? '0 0 ' + shadowRange + 'px rgba(' + parseInt(shadowColor.slice(1,3),16) + ',' + parseInt(shadowColor.slice(3,5),16) + ',' + parseInt(shadowColor.slice(5,7),16) + ',' + shadowOpacity/100 + ')' : undefined, borderRadius: shadowOpacity > 0 || canvasBg !== 'transparent' ? 8 : 0, padding: canvasBg !== 'transparent' ? '32px' : undefined, transition: 'all 0.3s' }}>
            <EditorContent editor={editor} />
            <BubbleToolbar editor={editor} />
          </div>
        </div>
        <SidePanel
          open={showPanel} activeTab={panelTab} notes={notes}
          drafts={drafts} currentDraft={currentDraft}
          comments={comments} editor={editor}
          onTabChange={setPanelTab} onNotesChange={setNotes}
          onLoadDraft={loadDraft} onNewDraft={newDraft}
          onDeleteDraft={deleteDraft} onCommentsChange={setComments}
        />
      </div>
      <StatsBar
        words={words} chars={chars} wordGoal={wordGoal}
        timer={timer} timerRunning={timerRunning} focusMode={focusMode}
        onTimerToggle={() => setTimerRunning(r => !r)}
        onTimerReset={() => { setTimerRunning(false); setTimer(0) }}
        onGoalChange={setWordGoal}
      />
      <SettingsModal
        open={showSettings} themes={THEMES} currentTheme={themeIdx}
        fontSize={fontSize} editorWidth={editorWidth} lineHeight={lineHeight}
        accentColor={accentColor} bgColor={bgColor || theme.bg}
        typewriterMode={typewriterMode}
        onClose={() => setShowSettings(false)} onTheme={setThemeIdx}
        onFontSize={setFontSize} onEditorWidth={setEditorWidth}
        onLineHeight={setLineHeight} onAccentColor={setAccentColor}
        onBgColor={setBgColor} onTypewriter={setTypewriterMode}
        bgImage={bgImage} bgBlur={bgBlur} bgDim={bgDim}
        onBgImage={setBgImage} onBgBlur={setBgBlur} onBgDim={setBgDim}
        canvasBg={canvasBg} canvasOpacity={canvasOpacity} canvasBlur={canvasBlur}
        shadowColor={shadowColor} shadowOpacity={shadowOpacity} shadowRange={shadowRange}
        onCanvasBg={setCanvasBg} onCanvasOpacity={setCanvasOpacity} onCanvasBlur={setCanvasBlur}
        onShadowColor={setShadowColor} onShadowOpacity={setShadowOpacity} onShadowRange={setShadowRange}

      />
      <ExportModal
        open={showExport}
        html={editor?.getHTML() ?? ''}
        draftName={currentDraft}
        onClose={() => setShowExport(false)}
      />
      <CommentSystem
        editor={editor} comments={comments} onCommentsChange={setComments}
        triggerComment={triggerComment} onTriggerHandled={() => setTriggerComment(false)}
      />
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
    </div>
  )
}