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
import SpacingPanel from './components/SpacingPanel'
import GlyphPicker from './components/GlyphPicker'
import { saveData, loadData, saveAudioTracks, loadAudioTracks, saveWorkspaceImages, loadWorkspaceImages, saveCustomKeySounds, loadCustomKeySounds, saveDocumentToFile, openDocumentFromFile, CustomTheme, StickyNote, AudioTrack, NoteSection, Comment, WorkspaceImage, CustomKeySounds } from './lib/storage'
import type { Draft as DraftType, Block } from './lib/storage'
import { setCustomSound, previewSound, SoundType } from './lib/keyboardSounds'
import { FontSize } from './lib/font-size'
import StickyLayer from './components/StickyLayer'
import WorkspaceImageLayer from './components/WorkspaceImageLayer'
import AudioPlayer from './components/AudioPlayer'
import ExportModal from './components/ExportModal'
import TimerPopup from './components/TimerPopup'
import PostureToast from './components/PostureToast'
import IdeationCanvas, { makeIdeationNote } from './components/IdeationCanvas'
import BlockEditor from './components/BlockEditor'
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  return 0.299*r + 0.587*g + 0.114*b
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
  const [drafts, setDrafts]                 = useState<Record<string, DraftType>>({ untitled: { content: '', savedAt: new Date().toISOString() } })
  const [currentDraft, setCurrentDraft]     = useState('untitled')
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [notes, setNotes]                   = useState('')
  const [accentPresets, setAccentPresets]   = useState<string[]>([])
  const [bgPresets, setBgPresets]           = useState<string[]>([])
  const [customThemes, setCustomThemes]     = useState<CustomTheme[]>([])
  const [workspaceImages, setWorkspaceImages] = useState<WorkspaceImage[]>([])
  const [imageMode, setImageMode]           = useState<'text' | 'workspace'>('workspace')
  const [keySounds, setKeySounds]           = useState(false)
  const [keySoundsVolume, setKeySoundsVolume] = useState(0.3)
  const [customKeySounds, setCustomKeySounds] = useState<CustomKeySounds>({ click: null, space: null, return: null, backspace: null })
  const [toolbarColor, setToolbarColor]     = useState('')
  const [toolbarTextColor, setToolbarTextColor] = useState('')
  const [paragraphSpacing, setParagraphSpacing] = useState(0.8)
  const [showSpacing, setShowSpacing]       = useState(false)
  const [showGlyphs, setShowGlyphs]         = useState(false)
  const [autoHideBars, setAutoHideBars]     = useState(false)
  const [barsHovered, setBarsHovered]       = useState(false)
  const [statsBarHovered, setStatsBarHovered] = useState(false)
  const [zoom, setZoom]                     = useState(1)
  const [showTimer, setShowTimer]           = useState(false)
  const [showConvertPrompt, setShowConvertPrompt] = useState(false)
  const [showBuildPrompt, setShowBuildPrompt]     = useState(false)
  const [pendingStage, setPendingStage]           = useState<1 | 2 | 3 | null>(null)
  const [postureEnabled, setPostureEnabled] = useState(false)
  const [postureInterval, setPostureInterval] = useState(30)
  const [showPosture, setShowPosture]       = useState(false)

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
      FontSize,
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
        setToolbarColor(data.settings.toolbarColor ?? '')
        setToolbarTextColor(data.settings.toolbarTextColor ?? '')
        setParagraphSpacing(data.settings.paragraphSpacing ?? 0.8)
        setPostureEnabled(data.settings.postureEnabled ?? false)
        setPostureInterval(data.settings.postureInterval ?? 30)
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
    r.setProperty('--bg',           bgColor || theme.bg)
    r.setProperty('--surface',      theme.surface)
    r.setProperty('--text',         theme.text)
    r.setProperty('--text2',        theme.text2)
    r.setProperty('--text3',        theme.text3)
    r.setProperty('--border',       theme.border)
    r.setProperty('--toolbar',      toolbarColor || theme.toolbar)
    r.setProperty('--toolbar-text', toolbarTextColor || theme.text2)
    r.setProperty('--accent',       accentColor)
    r.setProperty('--accent2',      darken(accentColor))
    const effectiveBg = bgColor || theme.bg
    const lum = getLuminance(effectiveBg)
    r.setProperty('--placeholder-color', lum > 0.5 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.18)')
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
  }, [themeIdx, accentColor, bgColor, bgImage, bgBlur, bgDim, toolbarColor, toolbarTextColor, theme])

  // Font/line-height — CSS vars apply immediately; setAttribute is a fallback for inline specificity
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--editor-font-size', `${fontSize}px`)
    r.setProperty('--editor-line-height', lineHeight.toString())
    if (editor) editor.view.dom.setAttribute('style', `font-size:${fontSize}px;line-height:${lineHeight};`)
  }, [fontSize, lineHeight, editor])

  useEffect(() => {
    document.documentElement.style.setProperty('--paragraph-spacing', `${paragraphSpacing}em`)
  }, [paragraphSpacing])

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
      saveData({ drafts, currentDraft, notes, notesSections, comments, stickyNotes, settings: { themeIdx, accentColor, bgColor, bgImage, bgBlur, bgDim, fontSize, editorWidth, lineHeight, wordGoal, showFormattingBar, canvasPadding, accentPresets, bgPresets, customThemes, showScrollbar, canvasAlign, spellCheckLang, imageMode, keySounds, keySoundsVolume, toolbarColor, toolbarTextColor, paragraphSpacing, postureEnabled, postureInterval } })
    }, 1500)
  }, [drafts, currentDraft, notes, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal, loaded, toolbarColor, toolbarTextColor, paragraphSpacing])

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

  // --- Stage system ---
  const currentDraftData = drafts[currentDraft] ?? { content: '' }
  const currentStage     = (currentDraftData.stage ?? 3) as 1 | 2 | 3
  const ideationNotes    = (currentDraftData as DraftType).ideationNotes ?? []
  const blocks           = (currentDraftData as DraftType).blocks ?? []
  const stageFont        = (currentDraftData as DraftType).stageFont ?? ''

  const patchDraft = useCallback((patch: Partial<DraftType>) => {
    setDrafts(d => ({ ...d, [currentDraft]: { ...d[currentDraft], ...patch } }))
  }, [currentDraft])

  const handleStageChange = useCallback((s: 1 | 2 | 3) => {
    const draft = drafts[currentDraft] as DraftType
    if (s === 2 && currentStage === 1 && !(draft.blocks?.length)) {
      setPendingStage(2)
      setShowConvertPrompt(true)
      return
    }
    if (s === 3 && currentStage === 2 && !draft.content) {
      setPendingStage(3)
      setShowBuildPrompt(true)
      return
    }
    patchDraft({ stage: s })
  }, [drafts, currentDraft, currentStage, patchDraft])

  const handleConvert = useCallback(() => {
    const draft = drafts[currentDraft] as DraftType
    const sorted = [...(draft.ideationNotes ?? [])].sort((a, b) => a.y - b.y)
    const newBlocks: Block[] = sorted.map(n => ({ id: n.id, content: n.content }))
    patchDraft({ blocks: newBlocks, stage: pendingStage ?? 2 })
    setShowConvertPrompt(false)
    setPendingStage(null)
  }, [drafts, currentDraft, patchDraft, pendingStage])

  const handleBuild = useCallback(() => {
    const draft = drafts[currentDraft] as DraftType
    const html = (draft.blocks ?? []).map(b => {
      const text = b.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      if (b.headingLevel === 1) return `<h1>${text}</h1>`
      if (b.headingLevel === 2) return `<h2>${text}</h2>`
      if (b.headingLevel === 3) return `<h3>${text}</h3>`
      return `<p>${text}</p>`
    }).join('')
    editor?.commands.setContent(html)
    if (draft.stageFont) editor?.chain().focus().setFontFamily(draft.stageFont).run()
    patchDraft({ content: html, stage: pendingStage ?? 3 })
    setShowBuildPrompt(false)
    setPendingStage(null)
  }, [drafts, currentDraft, editor, patchDraft, pendingStage])

  const saveDraft = useCallback(() => {
    if (!editor) return
    const updated = { ...drafts, [currentDraft]: { content: editor.getHTML(), savedAt: new Date().toISOString() } }
    setDrafts(updated)
    saveData({ drafts: updated, currentDraft, notes, settings: { themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal } })
  }, [editor, currentDraft, drafts, notes, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal])

  const saveToFile = useCallback(async () => {
    if (!editor) return
    saveDraft()
    const path = await saveDocumentToFile(editor.getHTML(), currentDraft, currentFilePath)
    if (path) setCurrentFilePath(path)
  }, [editor, currentDraft, currentFilePath, saveDraft])

  const openFile = useCallback(async () => {
    const result = await openDocumentFromFile()
    if (!result) return
    saveDraft()
    const draftName = result.title
    setDrafts(d => ({ ...d, [draftName]: { content: result.content, savedAt: new Date().toISOString() } }))
    setCurrentDraft(draftName)
    setCurrentFilePath(result.path)
    editor?.commands.setContent(result.content)
  }, [editor, saveDraft])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveToFile() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setShowExport(true) }
      if (e.key === 'Escape') { setShowSettings(false); setShowExport(false) }
      if (e.key === 'F11') { e.preventDefault(); toggleFocusMode() }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFocusMode, saveToFile])

  // Ctrl+scroll zoom
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(z => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)))
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [])

  // Posture reminder
  useEffect(() => {
    if (!postureEnabled) return
    const id = window.setInterval(() => setShowPosture(true), postureInterval * 60 * 1000)
    return () => clearInterval(id)
  }, [postureEnabled, postureInterval])

  const loadDraft = (name: string) => {
    saveDraft()
    setCurrentDraft(name)
    setCurrentFilePath(null)
    editor?.commands.setContent(drafts[name]?.content || '')
  }

  const newDraft = () => {
    const name = prompt('Draft name:')
    if (!name) return
    saveDraft()
    setDrafts(d => ({ ...d, [name]: { content: '', savedAt: new Date().toISOString() } }))
    setCurrentDraft(name)
    setCurrentFilePath(null)
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
          documentY: null,
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
          currentDraft={currentFilePath ? (currentFilePath.split(/[/\\]/).pop()?.replace(/\.folio$/i, '') ?? currentDraft) : currentDraft}
          focusMode={focusMode} timerRunning={timerRunning} timerOpen={showTimer}
          onNew={newDraft} onOpen={openFile} onSave={saveToFile} onExport={() => setShowExport(true)}
          onTogglePanel={() => setShowPanel(p => !p)}
          onToggleFocus={toggleFocusMode}
          onToggleTimer={() => setShowTimer(t => !t)}
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
          showSpacing={showSpacing} onToggleSpacing={() => { setShowSpacing(s => !s); setShowGlyphs(false) }}
          showGlyphs={showGlyphs}  onToggleGlyphs={() => { setShowGlyphs(g => !g); setShowSpacing(false) }}
          currentStage={currentStage} onStageChange={handleStageChange}
        />
        <FormattingBar editor={editor} visible={showFormattingBar} />
        {showSpacing && (
          <SpacingPanel
            lineHeight={lineHeight} onLineHeight={setLineHeight}
            paragraphSpacing={paragraphSpacing} onParagraphSpacing={setParagraphSpacing}
            topOffset={showFormattingBar ? 82 : 46}
            onClose={() => setShowSpacing(false)}
          />
        )}
        {showGlyphs && (
          <GlyphPicker
            onInsert={char => editor?.commands.insertContent(char)}
            topOffset={showFormattingBar ? 82 : 46}
            onClose={() => setShowGlyphs(false)}
          />
        )}
      </div>
      {autoHideBars && !barsHovered && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, zIndex: 201 }}
          onMouseEnter={() => setBarsHovered(true)}
        />
      )}
      <div
        ref={workspaceRef}
        style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'center top', transition: 'transform 0.1s ease' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
          if (!file) return
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const dropX = (e.clientX - rect.left) / zoom
          const dropY = (e.clientY - rect.top) / zoom
          const reader = new FileReader()
          reader.onload = ev => {
            const src = ev.target?.result as string
            if (imageMode === 'workspace') {
              setWorkspaceImages(imgs => [...imgs, { id: Date.now().toString(), src, alt: file.name, x: dropX - 150, y: dropY - 100, documentY: null, width: 300 }])
            } else {
              editor?.chain().focus().insertContent({ type: 'image', attrs: { src, alt: file.name, width: '100%', layout: 'block' } }).run()
            }
          }
          reader.readAsDataURL(file)
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: canvasAlign === 'left' ? 'flex-start' : canvasAlign === 'right' ? 'flex-end' : 'center', overflow: 'hidden', padding: '20px 48px' }} onClick={() => { if (focusMode && document.fullscreenElement) document.exitFullscreen() }}>
          <div ref={canvasRef} className={canvasBlur > 0 ? 'folio-canvas-blur' : ''} style={{ width: '100%', maxWidth: currentStage === 1 ? '100%' : editorWidth, flex: 1, position: 'relative', background: canvasBg === 'transparent' && canvasBlur > 0 ? 'rgba(0,0,0,0.01)' : canvasBg === 'transparent' ? 'transparent' : hexToRgba(canvasBg, canvasOpacity / 100), backdropFilter: canvasBlur > 0 ? 'blur(' + canvasBlur + 'px)' : undefined,
WebkitBackdropFilter: canvasBlur > 0 ? 'blur(' + canvasBlur + 'px)' : undefined, boxShadow: shadowOpacity > 0 ? '0 0 ' + shadowRange + 'px rgba(' + parseInt(shadowColor.slice(1,3),16) + ',' + parseInt(shadowColor.slice(3,5),16) + ',' + parseInt(shadowColor.slice(5,7),16) + ',' + shadowOpacity/100 + ')' : undefined, borderRadius: shadowOpacity > 0 || canvasBg !== 'transparent' ? 8 : 0, transition: 'all 0.3s' }}>
            {currentStage === 1 && (
              <IdeationCanvas
                notes={ideationNotes}
                onChange={notes => patchDraft({ ideationNotes: notes })}
                onAdd={() => {
                  const ws = workspaceRef.current
                  patchDraft({ ideationNotes: [...ideationNotes, makeIdeationNote(ws?.offsetWidth ?? 600, ws?.offsetHeight ?? 400)] })
                }}
              />
            )}
            {currentStage === 2 && (
              <BlockEditor
                blocks={blocks}
                stageFont={stageFont}
                onChange={b => patchDraft({ blocks: b })}
                onFontChange={f => patchDraft({ stageFont: f })}
                onBuildDocument={() => { setPendingStage(3); setShowBuildPrompt(true) }}
              />
            )}
            {currentStage === 3 && (
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
            )}
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
        <WorkspaceImageLayer images={workspaceImages} scrollTop={editorScrollTop} onChange={setWorkspaceImages} />
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
          timer={timer} timerRunning={timerRunning} timerPopupOpen={showTimer} focusMode={focusMode}
          onTimerToggle={() => setTimerRunning(r => !r)}
          onTimerReset={() => { setTimerRunning(false); setTimer(0) }}
          onGoalChange={setWordGoal}
        />
      </div>
      {showTimer && (
        <TimerPopup
          timer={timer} running={timerRunning}
          onToggle={() => setTimerRunning(r => !r)}
          onReset={() => { setTimerRunning(false); setTimer(0) }}
          onClose={() => setShowTimer(false)}
        />
      )}
      {showPosture && <PostureToast onDismiss={() => setShowPosture(false)} />}

      {/* Stage conversion prompts */}
      {(showConvertPrompt || showBuildPrompt) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 32px', maxWidth: 380, width: '90%', boxShadow: '0 12px 48px rgba(0,0,0,0.7)' }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 12 }}>
              {showConvertPrompt ? 'Stage 1 → 2' : 'Stage 2 → 3'}
            </div>
            <p style={{ fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 16, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 24px' }}>
              {showConvertPrompt
                ? 'Sort your ideas top-to-bottom and turn them into blocks? Your notes will still be here if you come back.'
                : 'Build your document from these blocks? The current draft will be replaced with the block content.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowConvertPrompt(false); setShowBuildPrompt(false); setPendingStage(null) }}
                style={{ padding: '8px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}
              >Cancel</button>
              <button
                onClick={showConvertPrompt ? handleConvert : handleBuild}
                style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: 'var(--bg)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}
              >{showConvertPrompt ? 'Convert' : 'Build'}</button>
            </div>
          </div>
        </div>
      )}
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
        toolbarColor={toolbarColor} onToolbarColor={setToolbarColor}
        toolbarTextColor={toolbarTextColor} onToolbarTextColor={setToolbarTextColor}
        postureEnabled={postureEnabled} onPostureEnabled={setPostureEnabled}
        postureInterval={postureInterval} onPostureInterval={setPostureInterval}
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