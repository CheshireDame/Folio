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
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import CommentSystem, { CommentMark } from './components/CommentSystem'
import { Extension } from '@tiptap/core'
import { playKeySound } from './lib/keyboardSounds'
import { useState, useEffect, useRef, useCallback } from 'react'
import Toolbar from './components/Toolbar'
import StatsBar from './components/StatsBar'
import SettingsModal from './components/SettingsModal'
import SidePanel from './components/SidePanel'
import BubbleToolbar from './components/BubbleToolbar'
import FormattingBar from './components/FormattingBar'
import { saveData, loadData, saveAudioTracks, loadAudioTracks, saveWorkspaceImages, loadWorkspaceImages, saveCustomKeySounds, loadCustomKeySounds, CustomTheme, StickyNote, AudioTrack, NoteSection, Comment, WorkspaceImage, CustomKeySounds } from './lib/storage'
import { setCustomSound, previewSound, SoundType } from './lib/keyboardSounds'
import StickyLayer from './components/StickyLayer'
import WorkspaceImageLayer from './components/WorkspaceImageLayer'
import AudioPlayer from './components/AudioPlayer'
import ExportModal from './components/ExportModal'
import './App.css'

const TabHandler = Extension.create({
  name: 'tabHandler',
  priority: 50,
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.insertContent('\t'),
    }
  },
})

const THEMES = [
  { name: 'Sepia',   bg: '#1a1814', surface: '#211f1b', text: '#e8e2d9', text2: '#a09890', text3: '#6b6058', border: '#3a3630', toolbar: '#15130f', accent: '#c4a882' },
  { name: 'Ivory',  bg: '#f5f0e8', surface: '#ede8de', text: '#2a2520', text2: '#6b6058', text3: '#9b9088', border: '#d4cfc6', toolbar: '#e3ddd3', accent: '#8b6f47' },
  { name: 'Slate',  bg: '#1c2128', surface: '#22272e', text: '#cdd9e5', text2: '#8b949e', text3: '#6e7681', border: '#373e47', toolbar: '#161b22', accent: '#90a8c0' },
  { name: 'Forest', bg: '#1a1f1a', surface: '#1f261f', text: '#d4e4d4', text2: '#8aaa8a', text3: '#5a7a5a', border: '#2e3d2e', toolbar: '#151a15', accent: '#90b090' },
  { name: 'Dusk',   bg: '#1e1a26', surface: '#261f33', text: '#e4daf0', text2: '#9d8fb0', text3: '#6a5f7a', border: '#3a2f50', toolbar: '#17131f', accent: '#b0a0d0' },
]

interface Draft { content: string; savedAt?: string }

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

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
  const [canvasPadding, setCanvasPadding]   = useState(32)
  const [shadowColor, setShadowColor]       = useState('#000000')
  const [shadowOpacity, setShadowOpacity]   = useState(0)
  const [shadowRange, setShadowRange]       = useState(20)
  const [fontSize, setFontSize]             = useState(20)
  const [editorWidth, setEditorWidth]       = useState(680)
  const [lineHeight, setLineHeight]         = useState(1.85)
  const [focusMode, setFocusMode]           = useState(false)
const [showSettings, setShowSettings]     = useState(false)
  const [showPanel, setShowPanel]           = useState(false)
  const [showExport, setShowExport]         = useState(false)
  const [showFormattingBar, setShowFormattingBar] = useState(true)
  const [showScrollbar, setShowScrollbar]         = useState(false)
  const [canvasAlign, setCanvasAlign]             = useState<'left'|'center'|'right'>('center')
  const [stickyNotes, setStickyNotes]             = useState<StickyNote[]>([])
  const [editorScrollTop, setEditorScrollTop]     = useState(0)
  const [spellCheckLang, setSpellCheckLang]       = useState('en')
  const [audioTracks, setAudioTracks]             = useState<AudioTrack[]>([])
  const [showAudio, setShowAudio]                 = useState(false)
  const [notesSections, setNotesSections]         = useState<NoteSection[]>([])
  const [comments, setComments]                   = useState<Comment[]>([])
  const [triggerComment, setTriggerComment]       = useState(false)
  const [panelTab, setPanelTab]             = useState<'notes'|'comments'|'drafts'>('notes')
  const [wordGoal, setWordGoal]             = useState(500)
  const [timer, setTimer]                   = useState(0)
  const [timerRunning, setTimerRunning]     = useState(false)
  const [drafts, setDrafts]                 = useState<Record<string, Draft>>({ untitled: { content: '', savedAt: new Date().toISOString() } })
  const [currentDraft, setCurrentDraft]     = useState('untitled')
  const [notes, setNotes]                   = useState('')
  const [accentPresets, setAccentPresets]   = useState<string[]>([])
  const [bgPresets, setBgPresets]           = useState<string[]>([])
  const [customThemes, setCustomThemes]     = useState<CustomTheme[]>([])
  const [workspaceImages, setWorkspaceImages] = useState<WorkspaceImage[]>([])
  const [imageMode, setImageMode]           = useState<'text' | 'workspace'>('text')
  const [keySounds, setKeySounds]           = useState(false)
  const [keySoundsVolume, setKeySoundsVolume] = useState(0.3)
  const [customKeySounds, setCustomKeySounds] = useState<CustomKeySounds>({ click: null, space: null, return: null, backspace: null })
  const [autoHideBars, setAutoHideBars]     = useState(false)
  const [barsHovered, setBarsHovered]       = useState(false)
  const [statsBarHovered, setStatsBarHovered] = useState(false)

  const timerRef      = useRef<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const saveTimeout   = useRef<number | null>(null)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLDivElement>(null)
  const workspaceRef  = useRef<HTMLDivElement>(null)
  const theme = THEMES[themeIdx]

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      TabHandler,
      FolioImage,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
      CharacterCount,
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Subscript,
      CommentMark,
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
setShowFormattingBar(data.settings.showFormattingBar ?? true)
        setShowScrollbar(data.settings.showScrollbar ?? false)
        setCanvasAlign(data.settings.canvasAlign ?? 'center')
        setStickyNotes(data.stickyNotes ?? [])
        setNotesSections(data.notesSections ?? [])
        setComments(data.comments ?? [])
        setDrafts(data.drafts ?? { untitled: { content: '', savedAt: new Date().toISOString() } })
        setCurrentDraft(data.currentDraft ?? 'untitled')
        setNotes(data.notes ?? '')
        setAccentPresets(data.settings.accentPresets ?? [])
        setBgPresets(data.settings.bgPresets ?? [])
        setCustomThemes(data.settings.customThemes ?? [])
        setCanvasPadding(data.settings.canvasPadding ?? 32)
        setSpellCheckLang(data.settings.spellCheckLang ?? 'en')
        setImageMode(data.settings.imageMode ?? 'text')
        setKeySounds(data.settings.keySounds ?? false)
        setKeySoundsVolume(data.settings.keySoundsVolume ?? 0.3)
      }
      setLoaded(true)
    })
    loadAudioTracks().then(setAudioTracks)
    loadWorkspaceImages().then(setWorkspaceImages)
    loadCustomKeySounds().then(setCustomKeySounds)
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

// Audio tracks persistence
  useEffect(() => {
    if (audioTracks.length > 0) saveAudioTracks(audioTracks)
  }, [audioTracks])

  // Workspace images persistence
  useEffect(() => {
    saveWorkspaceImages(workspaceImages)
  }, [workspaceImages])

  // Custom key sounds — decode data URLs into AudioBuffers whenever they change
  useEffect(() => {
    const types: SoundType[] = ['click', 'space', 'return', 'backspace']
    types.forEach(t => setCustomSound(t, customKeySounds[t]))
  }, [customKeySounds])

  // Custom key sounds persistence
  useEffect(() => {
    saveCustomKeySounds(customKeySounds)
  }, [customKeySounds])

  // Spell-check language
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('lang', spellCheckLang)
    editor.view.dom.setAttribute('spellcheck', 'true')
  }, [spellCheckLang, editor])

  // Keyboard sounds
  useEffect(() => {
    if (!keySounds) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      playKeySound(e.key, keySoundsVolume)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keySounds, keySoundsVolume])

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
      saveData({ drafts, currentDraft, notes, notesSections, comments, stickyNotes, settings: { themeIdx, accentColor, bgColor, bgImage, bgBlur, bgDim, fontSize, editorWidth, lineHeight, wordGoal, showFormattingBar, canvasPadding, accentPresets, bgPresets, customThemes, showScrollbar, canvasAlign, spellCheckLang, imageMode, keySounds, keySoundsVolume } })
    }, 1500)
  }, [drafts, currentDraft, notes, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal, loaded])

  const toggleFocusMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setFocusMode(true)
    } else {
      document.exitFullscreen()
      setFocusMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => { setFocusMode(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setShowExport(true) }
      if (e.key === 'Escape') { setShowSettings(false); setShowExport(false) }
      if (e.key === 'F11') { e.preventDefault(); toggleFocusMode() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFocusMode])

  const saveDraft = useCallback(() => {
    if (!editor) return
    const updated = { ...drafts, [currentDraft]: { content: editor.getHTML(), savedAt: new Date().toISOString() } }
    setDrafts(updated)
    saveData({ drafts: updated, currentDraft, notes, settings: { themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal } })
  }, [editor, currentDraft, drafts, notes, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal])

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

  const createNote = () => {
    const ws = workspaceRef.current
    const note: StickyNote = {
      id: Date.now().toString(),
      content: '',
      x: ws ? ws.offsetWidth / 2 - 105 : 200,
      viewportY: ws ? ws.offsetHeight / 2 - 80 : 100,
      documentY: null,
      color: '#f5e6a3',
      fontSize: 13,
    }
    setStickyNotes(n => [...n, note])
  }

const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      if (imageMode === 'workspace') {
        const ws = workspaceRef.current
        setWorkspaceImages(imgs => [...imgs, {
          id: Date.now().toString(),
          src, alt: file.name,
          x: ws ? ws.offsetWidth / 2 - 150 : 200,
          y: ws ? ws.offsetHeight / 2 - 100 : 100,
          width: 300,
        }])
      } else {
        editor?.chain().focus().insertContent({
          type: 'image',
          attrs: { src, alt: file.name, width: '100%', layout: 'block' }
        }).run()
      }
    }
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
      <div
        style={{
          position: autoHideBars ? 'fixed' : 'relative',
          top: 0, left: 0, right: 0,
          zIndex: autoHideBars ? 200 : 10,
          transform: autoHideBars && !barsHovered ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}
        onMouseEnter={() => setBarsHovered(true)}
        onMouseLeave={() => setBarsHovered(false)}
      >
        <Toolbar
          currentDraft={currentDraft} focusMode={focusMode} timerRunning={timerRunning}
          onNew={newDraft} onSave={saveDraft} onExport={() => setShowExport(true)}
          onTogglePanel={() => setShowPanel(p => !p)}
          onToggleFocus={toggleFocusMode}
onToggleTimer={() => setTimerRunning(r => !r)}
          onOpenSettings={() => setShowSettings(true)}
          onImage={() => imageInputRef.current?.click()}
          onToggleFormattingBar={() => setShowFormattingBar(f => !f)}
          showFormattingBar={showFormattingBar}
          onNewNote={createNote}
          onToggleAudio={() => setShowAudio(a => !a)}
          audioOpen={showAudio}
          autoHideBars={autoHideBars}
          onToggleAutoHideBars={() => setAutoHideBars(a => !a)}
          imageMode={imageMode}
          onToggleImageMode={() => setImageMode(m => m === 'text' ? 'workspace' : 'text')}
        />
        <FormattingBar editor={editor} visible={showFormattingBar} />
      </div>
      {autoHideBars && !barsHovered && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, zIndex: 201 }}
          onMouseEnter={() => setBarsHovered(true)}
        />
      )}
      <div ref={workspaceRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: canvasAlign === 'left' ? 'flex-start' : canvasAlign === 'right' ? 'flex-end' : 'center', overflow: 'hidden', padding: '20px 48px' }} onClick={() => { if (focusMode && document.fullscreenElement) document.exitFullscreen() }}>
          <div ref={canvasRef} className={canvasBlur > 0 ? 'folio-canvas-blur' : ''} style={{ width: '100%', maxWidth: editorWidth, flex: 1, position: 'relative', background: canvasBg === 'transparent' && canvasBlur > 0 ? 'rgba(0,0,0,0.01)' : canvasBg === 'transparent' ? 'transparent' : hexToRgba(canvasBg, canvasOpacity / 100), backdropFilter: canvasBlur > 0 ? 'blur(' + canvasBlur + 'px)' : undefined,
WebkitBackdropFilter: canvasBlur > 0 ? 'blur(' + canvasBlur + 'px)' : undefined, boxShadow: shadowOpacity > 0 ? '0 0 ' + shadowRange + 'px rgba(' + parseInt(shadowColor.slice(1,3),16) + ',' + parseInt(shadowColor.slice(3,5),16) + ',' + parseInt(shadowColor.slice(5,7),16) + ',' + shadowOpacity/100 + ')' : undefined, borderRadius: shadowOpacity > 0 || canvasBg !== 'transparent' ? 8 : 0, transition: 'all 0.3s' }}>
            <div ref={editorWrapRef} className={`folio-editor-wrap${showScrollbar ? ' scrollbar-visible' : ''}`} style={{ position: 'absolute', top: canvasPadding, right: canvasPadding, bottom: canvasPadding, left: canvasPadding, overflowY: 'auto',  }} onScroll={e => setEditorScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}>
              <EditorContent editor={editor} />
              <BubbleToolbar editor={editor} onTriggerComment={() => setTriggerComment(true)} />
              <CommentSystem
                popupOnly
                editor={editor}
                comments={comments}
                onCommentsChange={setComments}
                triggerComment={triggerComment}
                onTriggerHandled={() => setTriggerComment(false)}
              />
            </div>
          </div>
        </div>
        <SidePanel
          open={showPanel} activeTab={panelTab}
          notesSections={notesSections} comments={comments}
          drafts={drafts} currentDraft={currentDraft}
          editor={editor}
          onTabChange={setPanelTab}
          onNotesSectionsChange={setNotesSections}
          onCommentsChange={setComments}
          onLoadDraft={loadDraft} onNewDraft={newDraft}
          onDeleteDraft={deleteDraft}
        />
        <StickyLayer notes={stickyNotes} scrollTop={editorScrollTop} onChange={setStickyNotes} />
        <WorkspaceImageLayer images={workspaceImages} onChange={setWorkspaceImages} />
      </div>
      <div
        style={{
          position: autoHideBars ? 'fixed' : 'relative',
          bottom: autoHideBars ? 0 : undefined,
          left: autoHideBars ? 0 : undefined,
          right: autoHideBars ? 0 : undefined,
          zIndex: autoHideBars ? 200 : undefined,
          transform: autoHideBars && !statsBarHovered ? 'translateY(100%)' : 'translateY(0)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}
        onMouseEnter={() => setStatsBarHovered(true)}
        onMouseLeave={() => setStatsBarHovered(false)}
      >
        <StatsBar
          words={words} chars={chars} wordGoal={wordGoal}
          timer={timer} timerRunning={timerRunning} focusMode={focusMode}
          onTimerToggle={() => setTimerRunning(r => !r)}
          onTimerReset={() => { setTimerRunning(false); setTimer(0) }}
          onGoalChange={setWordGoal}
        />
      </div>
      {autoHideBars && !statsBarHovered && (
        <div
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 8, zIndex: 201 }}
          onMouseEnter={() => setStatsBarHovered(true)}
        />
      )}
      <SettingsModal
        open={showSettings} themes={THEMES} currentTheme={themeIdx}
        fontSize={fontSize} editorWidth={editorWidth} lineHeight={lineHeight}
        accentColor={accentColor} bgColor={bgColor || theme.bg}
        onClose={() => setShowSettings(false)} onTheme={setThemeIdx}
        onFontSize={setFontSize} onEditorWidth={setEditorWidth}
        onLineHeight={setLineHeight} onAccentColor={setAccentColor}
        onBgColor={setBgColor}
        showScrollbar={showScrollbar} onShowScrollbar={setShowScrollbar}
        canvasAlign={canvasAlign} onCanvasAlign={setCanvasAlign}
        spellCheckLang={spellCheckLang} onSpellCheckLang={setSpellCheckLang}
        bgImage={bgImage} bgBlur={bgBlur} bgDim={bgDim}
        onBgImage={setBgImage} onBgBlur={setBgBlur} onBgDim={setBgDim}
        canvasBg={canvasBg} canvasOpacity={canvasOpacity} canvasBlur={canvasBlur} canvasPadding={canvasPadding} onCanvasPadding={setCanvasPadding}
        shadowColor={shadowColor} shadowOpacity={shadowOpacity} shadowRange={shadowRange}
        onCanvasBg={setCanvasBg} onCanvasOpacity={setCanvasOpacity} onCanvasBlur={setCanvasBlur}
        onShadowColor={setShadowColor} onShadowOpacity={setShadowOpacity} onShadowRange={setShadowRange}
        accentPresets={accentPresets} bgPresets={bgPresets}
        onSaveAccentPreset={() => setAccentPresets(p => [...p, accentColor])}
        onDeleteAccentPreset={(i: number) => setAccentPresets(p => p.filter((_, idx) => idx !== i))}
        onSaveBgPreset={() => setBgPresets(p => [...p, bgColor || theme.bg])}
        onDeleteBgPreset={(i: number) => setBgPresets(p => p.filter((_, idx) => idx !== i))}
        customThemes={customThemes}
        onSaveCustomTheme={(name: string) => setCustomThemes(p => [...p, {
          name,
          bg: bgColor || theme.bg, surface: theme.surface, text: theme.text,
          text2: theme.text2, text3: theme.text3, border: theme.border,
          toolbar: theme.toolbar, accent: accentColor,
          bgImage, bgBlur, bgDim,
        }])}
        onDeleteCustomTheme={(i: number) => setCustomThemes(p => p.filter((_, idx) => idx !== i))}
        onApplyCustomTheme={(t: CustomTheme) => {
          setBgColor(t.bg); setAccentColor(t.accent)
          setBgImage(t.bgImage); setBgBlur(t.bgBlur); setBgDim(t.bgDim)
        }}
        keySounds={keySounds} onKeySounds={setKeySounds}
        keySoundsVolume={keySoundsVolume} onKeySoundsVolume={setKeySoundsVolume}
        customKeySounds={customKeySounds}
        onCustomKeySound={(type, url) => setCustomKeySounds(s => ({ ...s, [type]: url }))}
        onPreviewSound={(type) => previewSound(type, keySoundsVolume)}
      />
      <ExportModal
        open={showExport}
        html={editor?.getHTML() ?? ''}
        draftName={currentDraft}
        onClose={() => setShowExport(false)}
      />
<input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
      <AudioPlayer
        open={showAudio}
        tracks={audioTracks}
        onAddTrack={t => setAudioTracks(ts => [...ts, t])}
        onRemoveTrack={id => setAudioTracks(ts => {
          const updated = ts.filter(t => t.id !== id)
          saveAudioTracks(updated)
          return updated
        })}
      />
    </div>
  )
}
// pookie said I should have " respect for the craft" and write this along with descriptions to keep track of my updates or some other bullshit you say when you're in a godless country ruled by a monarchy idk I get bitches