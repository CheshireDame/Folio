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
import { saveData, loadData, saveAudioTracks, loadAudioTracks, loadWorkspaceImages, saveCustomKeySounds, loadCustomKeySounds, saveDocumentToFile, openDocumentFromFile, CustomTheme, StickyNote, AudioTrack, NoteSection, Comment, WorkspaceImage, CustomKeySounds } from './lib/storage'
import type { Draft as DraftType, Block, ThemePalette } from './lib/storage'
import { saveCustomFonts, loadCustomFonts, type CustomFont } from './lib/storage'
import { BUILTIN_FONTS, DEFAULT_FONT } from './lib/fonts'
import { exportTheme, importTheme, isSafeFontFamily, isSafeDataUrl } from './lib/themeShare'
import { setCustomSound, previewSound, SoundType } from './lib/keyboardSounds'
import { FontSize } from './lib/font-size'
import StickyLayer from './components/StickyLayer'
import WorkspaceImageLayer from './components/WorkspaceImageLayer'
import AudioPlayer from './components/AudioPlayer'
import ExportModal from './components/ExportModal'
import TimerPopup from './components/TimerPopup'
import PostureToast from './components/PostureToast'
import PosturePopup from './components/PosturePopup'
import { playChime } from './lib/chime'
import IdeationCanvas, { makeIdeationNote } from './components/IdeationCanvas'
import BlockEditor from './components/BlockEditor'
import MindMap from './components/MindMap'
import { loadMindMap, saveMindMap, EMPTY_MIND_MAP, MindMapData } from './lib/storage'
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
  amt = Math.min(1, Math.max(0, amt))
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return '#' + [r,g,b].map(v => Math.round(v*(1-amt)).toString(16).padStart(2,'0')).join('')
}

function lighten(hex: string, amt = 0.35): string {
  amt = Math.min(1, Math.max(0, amt))
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return '#' + [r,g,b].map(v => Math.round(v + (255-v)*amt).toString(16).padStart(2,'0')).join('')
}

function srgbToLinear(c: number): number {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return 0.2126*srgbToLinear(r) + 0.7152*srgbToLinear(g) + 0.0722*srgbToLinear(b)
}

// WCAG contrast ratio (1–21). 4.5 is the "AA, normal text" bar.
function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA)
  const l2 = relativeLuminance(hexB)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
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
  const [editorFontFamily, setEditorFontFamily] = useState('Crimson Pro')
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
  const [postureIntervalSec, setPostureIntervalSec] = useState(30 * 60)
  const [postureSound, setPostureSound]     = useState(true)
  const [showPosture, setShowPosture]       = useState(false)
  const [showPostureMenu, setShowPostureMenu] = useState(false)
  const [showMindMap, setShowMindMap]       = useState(false)
  const [mindMap, setMindMap]               = useState<MindMapData>(EMPTY_MIND_MAP)
  const [paletteOverride, setPaletteOverride] = useState<Partial<ThemePalette> | null>(null)
  const [customFonts, setCustomFonts]       = useState<CustomFont[]>([])
  // Lifted out of AudioPlayer so a saved theme can restore what was playing.
  const [musicTrackId, setMusicTrackId]     = useState<string | null>(null)
  const [musicVolume, setMusicVolume]       = useState(60)

  const timerRef      = useRef<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const saveTimeout   = useRef<number | null>(null)
  const mindMapSaveTimeout = useRef<number | null>(null)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLDivElement>(null)
  const workspaceRef  = useRef<HTMLDivElement>(null)
  // A custom theme layers its saved colors over the built-in palette. Without
  // this merge the text/surface/border colors stored on a CustomTheme could
  // never take effect, and applying one appeared to only change the background.
  const theme = paletteOverride ? { ...THEMES[themeIdx], ...paletteOverride } : THEMES[themeIdx]

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
    Promise.all([loadData(), loadWorkspaceImages()]).then(([data, legacyImages]) => {
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

        const cd = data.currentDraft ?? 'untitled'
        let loadedDrafts = data.drafts ?? { untitled: { content: '', savedAt: new Date().toISOString() } }
        if (!loadedDrafts[cd]) loadedDrafts = { ...loadedDrafts, [cd]: { content: '' } }
        const cdDraft = loadedDrafts[cd]
        // One-time migration: older versions stored notes/images globally instead of per-draft.
        const isUnmigrated = cdDraft.stickyNotes === undefined && cdDraft.notesSections === undefined
          && cdDraft.comments === undefined && cdDraft.workspaceImages === undefined
        if (isUnmigrated && (data.stickyNotes?.length || data.notesSections?.length || data.comments?.length || legacyImages.length)) {
          loadedDrafts = {
            ...loadedDrafts,
            [cd]: {
              ...cdDraft,
              stickyNotes: data.stickyNotes ?? [],
              notesSections: data.notesSections ?? [],
              comments: data.comments ?? [],
              workspaceImages: legacyImages,
            },
          }
        }
        setDrafts(loadedDrafts)
        setCurrentDraft(cd)
        setStickyNotes(loadedDrafts[cd].stickyNotes ?? [])
        setNotesSections(loadedDrafts[cd].notesSections ?? [])
        setComments(loadedDrafts[cd].comments ?? [])
        setWorkspaceImages(loadedDrafts[cd].workspaceImages ?? [])

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
        setEditorFontFamily(data.settings.editorFontFamily ?? 'Crimson Pro')
        setParagraphSpacing(data.settings.paragraphSpacing ?? 0.8)
        setPostureEnabled(data.settings.postureEnabled ?? false)
        setPostureIntervalSec(data.settings.postureIntervalSec ?? (data.settings.postureInterval ? data.settings.postureInterval * 60 : 30 * 60))
        setPostureSound(data.settings.postureSound ?? true)
        setPaletteOverride(data.settings.paletteOverride ?? null)
        setCanvasBg(data.settings.canvasBg ?? 'transparent')
        setCanvasOpacity(data.settings.canvasOpacity ?? 100)
        setCanvasBlur(data.settings.canvasBlur ?? 0)
        setShadowColor(data.settings.shadowColor ?? '#000000')
        setShadowOpacity(data.settings.shadowOpacity ?? 0)
        setShadowRange(data.settings.shadowRange ?? 20)
        setMusicTrackId(data.settings.musicTrackId ?? null)
        setMusicVolume(data.settings.musicVolume ?? 60)
      }
      setLoaded(true)
    })
    loadAudioTracks().then(setAudioTracks)
    loadCustomKeySounds().then(setCustomKeySounds)
    loadMindMap().then(setMindMap)
    loadCustomFonts().then(setCustomFonts)
  }, [])

  // Mind-map persistence, debounced — dragging a bend point/bubble fires an
  // onChange (and this effect) on every mousemove tick. Saving on every single
  // one queues a real Tauri IPC file write per tick; a smooth drag can queue
  // dozens back-to-back, backing up the webview and making it feel "stuck" for
  // a moment after you let go while that backlog drains (a plain browser tab
  // never surfaces this since there's no real file I/O to back up).
  useEffect(() => {
    if (!loaded) return
    if (mindMapSaveTimeout.current) clearTimeout(mindMapSaveTimeout.current)
    mindMapSaveTimeout.current = window.setTimeout(() => { saveMindMap(mindMap) }, 500)
  }, [mindMap, loaded])

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
    const toolbarBase = toolbarColor || theme.toolbar
    r.setProperty('--toolbar',      toolbarBase)
    const toolbarIsLight = getLuminance(toolbarBase) > 0.5
    const darkText = '#1f1c17'
    const lightText = '#f2ede4'
    // Toolbar text: honor a manual override, otherwise pick whichever extreme actually
    // contrasts best against the toolbar color itself (a fixed muted gray reads fine on the
    // default near-black toolbar but goes illegible once the toolbar color is customized).
    // Prefer the theme's own text color so the toolbar shifts with the theme
    // instead of snapping between the same near-black/near-white pair every
    // time. Only when it fails AA (4.5:1) against the toolbar do we fall back
    // to whichever extreme actually contrasts — legibility wins over palette.
    const bestExtreme = contrastRatio(toolbarBase, darkText) >= contrastRatio(toolbarBase, lightText) ? darkText : lightText
    const toolbarTextAuto = contrastRatio(toolbarBase, theme.text) >= 4.5 ? theme.text : bestExtreme
    r.setProperty('--toolbar-text', toolbarTextColor || toolbarTextAuto)
    r.setProperty('--accent',       accentColor)
    r.setProperty('--accent2',      darken(accentColor))
    // Legible label colour for anything painted on top of the accent (filled
    // buttons). Using --bg for this broke once a custom theme could set the
    // background and the accent to nearby colours.
    r.setProperty('--accent-text',  contrastRatio(accentColor, darkText) >= contrastRatio(accentColor, lightText) ? darkText : lightText)
    // Small popups (timer, audio, posture, panel…) sit near the toolbar — toolbar color adaptation.
    // Push the shade further from the toolbar (and re-check real WCAG contrast) until legible in
    // every hue, since a fixed small offset reads fine on neutrals but goes muddy on saturated colors.
    // Target AAA (7:1), not just AA, since muted secondary/tertiary text rides on top of this at
    // reduced opacity and needs the extra headroom to stay readable.
    let menuBg = toolbarIsLight ? darken(toolbarBase, 0.14) : lighten(toolbarBase, 0.22)
    let bestRatio = Math.max(contrastRatio(menuBg, darkText), contrastRatio(menuBg, lightText))
    for (let extra = 0.1; bestRatio < 7 && extra <= 0.8; extra += 0.1) {
      menuBg = toolbarIsLight ? darken(toolbarBase, 0.14 + extra) : lighten(toolbarBase, 0.22 + extra)
      bestRatio = Math.max(contrastRatio(menuBg, darkText), contrastRatio(menuBg, lightText))
    }
    r.setProperty('--menu-bg', menuBg)
    // Scrollbar thumb tracks the toolbar color, pushed for contrast so it stays visible over the canvas
    const scrollbarThumb = toolbarIsLight ? darken(toolbarBase, 0.3) : lighten(toolbarBase, 0.32)
    r.setProperty('--scrollbar-thumb', scrollbarThumb)
    r.setProperty('--scrollbar-thumb-hover', toolbarIsLight ? darken(toolbarBase, 0.45) : lighten(toolbarBase, 0.48))
    const menuIsLight = contrastRatio(menuBg, darkText) >= contrastRatio(menuBg, lightText)
    r.setProperty('--menu-text',  menuIsLight ? darkText : lightText)
    r.setProperty('--menu-text2', menuIsLight ? 'rgba(31,28,23,0.82)' : 'rgba(242,237,228,0.82)')
    r.setProperty('--menu-text3', menuIsLight ? 'rgba(31,28,23,0.65)' : 'rgba(242,237,228,0.65)')
    // A filled button has to be distinguishable from the panel it sits on, not
    // just have legible text. Push the accent away from --menu-bg until it
    // clears 3:1 — WCAG's bar for non-text UI — because an accent close to the
    // panel colour makes the button shape itself vanish. Falls back to the
    // accent unchanged when it already contrasts.
    let accentUi = accentColor
    if (contrastRatio(accentUi, menuBg) < 3) {
      // Move toward whichever extreme the panel is furthest from — comparing
      // against white/black directly, since a raw luminance threshold picks the
      // wrong direction for mid-tone panels and pushes the accent *into* them.
      const goLighter = contrastRatio(menuBg, '#ffffff') > contrastRatio(menuBg, '#000000')
      for (let a = 0.05; a <= 0.95; a += 0.05) {
        accentUi = goLighter ? lighten(accentColor, a) : darken(accentColor, a)
        if (contrastRatio(accentUi, menuBg) >= 3) break
      }
    }
    r.setProperty('--accent-ui', accentUi)
    r.setProperty('--accent-ui-text', contrastRatio(accentUi, darkText) >= contrastRatio(accentUi, lightText) ? darkText : lightText)
    // Tinted fill for "active/running" states — pairs with an --accent-ui border
    // so the button keeps a visible shape even when it is not solid.
    r.setProperty('--accent-soft', hexToRgba(accentUi, 0.18))
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

  // Register uploaded fonts with the document so `font-family: "<family>"`
  // resolves anywhere in the app — editor, previews, exported-to-screen text.
  // One <style> element rebuilt on change, rather than one per font.
  useEffect(() => {
    const ID = 'folio-custom-fonts'
    let el = document.getElementById(ID) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = ID
      document.head.appendChild(el)
    }
    // Both values land inside a <style> element, so a family name or data URL
    // containing CSS syntax could close the rule and inject its own. Filenames
    // supply the family and imported themes supply both, so neither is trusted.
    el.textContent = customFonts
      .filter(f => isSafeFontFamily(f.family) && isSafeDataUrl(f.data))
      .map(f => `@font-face{font-family:"${f.family}";src:url(${f.data});font-display:swap;}`)
      .join('\n')
  }, [customFonts])

  // Font/line-height — CSS vars apply immediately; setAttribute is a fallback for inline specificity
  useEffect(() => {
    const r = document.documentElement.style
    const fontStack = `"${editorFontFamily}", Georgia, serif`
    r.setProperty('--editor-font-size', `${fontSize}px`)
    r.setProperty('--editor-line-height', lineHeight.toString())
    r.setProperty('--editor-font-family', fontStack)
    if (editor) editor.view.dom.setAttribute('style', `font-size:${fontSize}px;line-height:${lineHeight};font-family:${fontStack};`)
  }, [fontSize, lineHeight, editorFontFamily, editor])

  useEffect(() => {
    document.documentElement.style.setProperty('--paragraph-spacing', `${paragraphSpacing}em`)
  }, [paragraphSpacing])

// Audio tracks persistence
  useEffect(() => {
    if (audioTracks.length > 0) saveAudioTracks(audioTracks)
  }, [audioTracks])

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
      const draftsWithExtras = {
        ...drafts,
        [currentDraft]: { ...drafts[currentDraft], stickyNotes, notesSections, comments, workspaceImages },
      }
      saveData({ drafts: draftsWithExtras, currentDraft, settings: { themeIdx, accentColor, bgColor, bgImage, bgBlur, bgDim, fontSize, editorWidth, lineHeight, wordGoal, showFormattingBar, canvasPadding, accentPresets, bgPresets, customThemes, showScrollbar, canvasAlign, spellCheckLang, imageMode, keySounds, keySoundsVolume, toolbarColor, toolbarTextColor, editorFontFamily, paragraphSpacing, postureEnabled, postureIntervalSec, postureSound, paletteOverride, musicTrackId, musicVolume, canvasBg, canvasOpacity, canvasBlur, shadowColor, shadowOpacity, shadowRange } })
    }, 1500)
  // Every value written above must be listed here, or changing it alone never
  // marks settings dirty and the change is lost on restart (this is what was
  // dropping background-image and custom-theme changes).
  }, [drafts, currentDraft, stickyNotes, notesSections, comments, workspaceImages, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal, loaded, toolbarColor, toolbarTextColor, editorFontFamily, paragraphSpacing, postureEnabled, postureIntervalSec, postureSound, customThemes, paletteOverride, musicTrackId, musicVolume, canvasBg, canvasOpacity, canvasBlur, shadowColor, shadowOpacity, shadowRange, bgImage, bgBlur, bgDim, showFormattingBar, canvasPadding, accentPresets, bgPresets, showScrollbar, canvasAlign, spellCheckLang, imageMode, keySounds, keySoundsVolume])

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

  // Snapshots the in-memory notes/images (which belong to currentDraft) back into `drafts`.
  const snapshotCurrentDraft = useCallback((): Record<string, DraftType> => ({
    ...drafts,
    [currentDraft]: {
      ...drafts[currentDraft],
      content: editor ? editor.getHTML() : (drafts[currentDraft]?.content ?? ''),
      savedAt: new Date().toISOString(),
      stickyNotes, notesSections, comments, workspaceImages,
    },
  }), [drafts, currentDraft, editor, stickyNotes, notesSections, comments, workspaceImages])

  const saveDraft = useCallback(() => {
    if (!editor) return
    const updated = snapshotCurrentDraft()
    setDrafts(updated)
    saveData({ drafts: updated, currentDraft, settings: { themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal } })
  }, [editor, currentDraft, snapshotCurrentDraft, themeIdx, accentColor, bgColor, fontSize, editorWidth, lineHeight, wordGoal])

  const saveToFile = useCallback(async () => {
    if (!editor) return
    saveDraft()
    const path = await saveDocumentToFile(editor.getHTML(), currentDraft, currentFilePath)
    if (path) setCurrentFilePath(path)
  }, [editor, currentDraft, currentFilePath, saveDraft])

  // Persists the outgoing draft's notes/images, then swaps the editor and note/image
  // state over to `name` so each draft keeps its own notes and images.
  const switchToDraft = useCallback((name: string, overrides?: Partial<DraftType>) => {
    const base = snapshotCurrentDraft()
    const merged = overrides ? { ...base, [name]: { ...base[name], ...overrides } } : base
    setDrafts(merged)
    setCurrentDraft(name)
    const target = merged[name] ?? { content: '' }
    editor?.commands.setContent(target.content || '')
    setStickyNotes(target.stickyNotes ?? [])
    setNotesSections(target.notesSections ?? [])
    setComments(target.comments ?? [])
    setWorkspaceImages(target.workspaceImages ?? [])
  }, [snapshotCurrentDraft, editor])

  const openFile = useCallback(async () => {
    const result = await openDocumentFromFile()
    if (!result) return
    switchToDraft(result.title, { content: result.content, savedAt: new Date().toISOString() })
    setCurrentFilePath(result.path)
  }, [switchToDraft])

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
    const id = window.setInterval(() => {
      setShowPosture(true)
      if (postureSound) playChime(0.5)
    }, postureIntervalSec * 1000)
    return () => clearInterval(id)
  }, [postureEnabled, postureIntervalSec, postureSound])

  const loadDraft = (name: string) => {
    switchToDraft(name)
    setCurrentFilePath(null)
  }

  const newDraft = () => {
    const name = prompt('Draft name:')
    if (!name) return
    switchToDraft(name, { content: '', savedAt: new Date().toISOString(), stickyNotes: [], notesSections: [], comments: [], workspaceImages: [] })
    setCurrentFilePath(null)
  }

  const deleteDraft = (name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const remaining = Object.keys(drafts).filter(k => k !== name)
    const withoutDeleted = { ...drafts }
    delete withoutDeleted[name]
    if (currentDraft !== name) {
      setDrafts(withoutDeleted)
      return
    }
    // Switch away without persisting the deleted draft's notes/images.
    if (remaining.length) {
      const next = remaining[remaining.length - 1]
      const target = withoutDeleted[next]
      setDrafts(withoutDeleted)
      setCurrentDraft(next)
      setCurrentFilePath(null)
      editor?.commands.setContent(target?.content || '')
      setStickyNotes(target?.stickyNotes ?? [])
      setNotesSections(target?.notesSections ?? [])
      setComments(target?.comments ?? [])
      setWorkspaceImages(target?.workspaceImages ?? [])
    } else {
      setDrafts({ untitled: { content: '', savedAt: new Date().toISOString() } })
      setCurrentDraft('untitled')
      setCurrentFilePath(null)
      editor?.commands.clearContent()
      setStickyNotes([])
      setNotesSections([])
      setComments([])
      setWorkspaceImages([])
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
          onOpenMindMap={() => setShowMindMap(true)}
          postureEnabled={postureEnabled} postureMenuOpen={showPostureMenu} onTogglePosture={() => setShowPostureMenu(m => !m)}
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
      {showPostureMenu && (
        <PosturePopup
          enabled={postureEnabled} onToggleEnabled={() => setPostureEnabled(p => !p)}
          intervalSec={postureIntervalSec} onIntervalSecChange={setPostureIntervalSec}
          sound={postureSound} onToggleSound={() => setPostureSound(s => !s)}
          onClose={() => setShowPostureMenu(false)}
        />
      )}

      {showMindMap && (
        <MindMap
          data={mindMap}
          onChange={setMindMap}
          onClose={() => setShowMindMap(false)}
          ideationNotes={ideationNotes}
          notesSections={notesSections}
        />
      )}

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
                style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: 'var(--accent-text)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}
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
        accentColor={accentColor} themeAccent={theme.accent}
        bgColor={bgColor || theme.bg} themeBg={theme.bg}
        onClose={() => setShowSettings(false)}
        // Picking a built-in theme drops every in-flight override layered on
        // top, otherwise they mask the theme the user just chose. Built-ins
        // define no canvas of their own, so its default is transparent — the
        // canvas then shows the chosen theme's background through it.
        onTheme={(i: number) => {
          setThemeIdx(i); setPaletteOverride(null)
          setAccentColor(THEMES[i].accent)
          setBgColor(''); setToolbarColor(''); setToolbarTextColor('')
          setCanvasBg('transparent'); setCanvasOpacity(100); setCanvasBlur(0)
          setShadowColor('#000000'); setShadowOpacity(0); setShadowRange(20)
          // Type resets too. Font *color* needs nothing here — it reads from
          // --text, so clearing the palette override above already returns it
          // to the chosen theme's text color.
          setFontSize(20); setLineHeight(1.85); setParagraphSpacing(0.8)
          setEditorFontFamily('Crimson Pro')
        }}
        onFontSize={setFontSize} onEditorWidth={setEditorWidth}
        onLineHeight={setLineHeight} onAccentColor={setAccentColor}
        // Picking the theme's own background clears the override rather than
        // storing an identical copy, so the background stays linked to the
        // theme — which is what the rest of the theme logic keys off.
        onBgColor={(c: string) => setBgColor(c === theme.bg ? '' : c)}
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
          // Bake the *effective* colors in. A manual override (toolbarColor,
          // bgColor) is in-flight customization; saving makes it this theme's
          // own color, so the record matches what was actually on screen.
          bg: bgColor || theme.bg, surface: theme.surface, text: theme.text,
          text2: theme.text2, text3: theme.text3, border: theme.border,
          toolbar: toolbarColor || theme.toolbar, accent: accentColor,
          bgImage, bgBlur, bgDim,
          toolbarColor, toolbarTextColor, editorFontFamily,
          themeIdx,
          canvasBg, canvasOpacity, canvasBlur,
          shadowColor, shadowOpacity, shadowRange,
          fontSize, lineHeight, paragraphSpacing, editorWidth,
          keySounds, keySoundsVolume, customKeySounds,
          musicTrackId, musicVolume,
        }])}
        onDeleteCustomTheme={(i: number) => setCustomThemes(p => p.filter((_, idx) => idx !== i))}
        onApplyCustomTheme={(t: CustomTheme) => {
          // Restore the whole workspace, not just the background. Anything the
          // theme does not specify resets to its default rather than carrying
          // over, so no part of the previous look leaks into this one.
          if (t.themeIdx !== undefined) setThemeIdx(t.themeIdx)
          setPaletteOverride({
            bg: t.bg, surface: t.surface, text: t.text, text2: t.text2,
            text3: t.text3, border: t.border, accent: t.accent,
            // Themes saved before colors were baked in kept the manual toolbar
            // override in a separate field; prefer it so those still apply the
            // color that was actually on screen when they were saved.
            toolbar: t.toolbarColor || t.toolbar,
          })
          // Switching themes drops in-flight overrides — the theme's own baked
          // colors take over, so nothing leaks in from the previous look.
          setBgColor(''); setToolbarColor('')
          setAccentColor(t.accent)
          setBgImage(t.bgImage); setBgBlur(t.bgBlur); setBgDim(t.bgDim)
          // An explicit toolbar text color stays a deliberate choice; when unset
          // it recomputes for contrast against the theme's toolbar color.
          setToolbarTextColor(t.toolbarTextColor ?? '')
          // A theme stores the font's name; the file itself lives in fonts.json.
          // If that font has since been deleted, fall back rather than leaving
          // the picker showing a family that silently renders as Georgia.
          const wantFont = t.editorFontFamily || DEFAULT_FONT
          const fontAvailable = BUILTIN_FONTS.includes(wantFont) || customFonts.some(f => f.family === wantFont)
          setEditorFontFamily(fontAvailable ? wantFont : DEFAULT_FONT)
          // Canvas and shadow are part of the look a theme defines, so they
          // reset rather than carry over — a theme saved without them must not
          // inherit the previous theme's canvas color.
          setCanvasBg(t.canvasBg ?? 'transparent')
          setCanvasOpacity(t.canvasOpacity ?? 100)
          setCanvasBlur(t.canvasBlur ?? 0)
          setShadowColor(t.shadowColor ?? '#000000')
          setShadowOpacity(t.shadowOpacity ?? 0)
          setShadowRange(t.shadowRange ?? 20)
          // Type is part of the theme too, so it resets rather than carries
          // over — same reasoning as canvas above.
          setFontSize(t.fontSize ?? 20)
          setLineHeight(t.lineHeight ?? 1.85)
          setParagraphSpacing(t.paragraphSpacing ?? 0.8)
          setEditorWidth(t.editorWidth ?? 680)
          if (t.keySounds !== undefined) setKeySounds(t.keySounds)
          if (t.keySoundsVolume !== undefined) setKeySoundsVolume(t.keySoundsVolume)
          if (t.customKeySounds) setCustomKeySounds(t.customKeySounds)
          if (t.musicVolume !== undefined) setMusicVolume(t.musicVolume)
          // Only restore music the library still has — a referenced track may
          // have been deleted since the theme was saved.
          if (t.musicTrackId !== undefined) {
            setMusicTrackId(audioTracks.some(a => a.id === t.musicTrackId) ? t.musicTrackId : null)
          }
        }}
        keySounds={keySounds} onKeySounds={setKeySounds}
        keySoundsVolume={keySoundsVolume} onKeySoundsVolume={setKeySoundsVolume}
        customKeySounds={customKeySounds}
        onCustomKeySound={(type, url) => setCustomKeySounds(s => ({ ...s, [type]: url }))}
        onPreviewSound={(type) => previewSound(type, keySoundsVolume)}
        toolbarColor={toolbarColor} onToolbarColor={setToolbarColor}
        toolbarTextColor={toolbarTextColor} onToolbarTextColor={setToolbarTextColor}
        editorFontFamily={editorFontFamily} onEditorFontFamily={setEditorFontFamily}
        onExportTheme={(t: CustomTheme) => {
          // Inline whatever the theme only references, so the file stands alone
          // on a machine that has neither the font nor the track.
          const font = customFonts.find(f => f.family === t.editorFontFamily) ?? null
          const music = audioTracks.find(a => a.id === t.musicTrackId) ?? null
          exportTheme(t, font, music)
        }}
        onImportTheme={async () => {
          const res = await importTheme()
          if (!res.ok) return
          const { theme, font, music } = res.bundle
          if (font) {
            setCustomFonts(fs => {
              // Keep an existing font of the same name — the local file is the
              // one already referenced by other themes.
              if (fs.some(f => f.family === font.family)) return fs
              const next = [...fs, font]
              saveCustomFonts(next)
              return next
            })
          }
          if (music) {
            setAudioTracks(ts => {
              if (ts.some(a => a.id === music.id)) return ts
              const next = [...ts, music]
              saveAudioTracks(next)
              return next
            })
          }
          // Name-collide rather than overwrite: an import should never silently
          // replace a theme the user already tuned.
          setCustomThemes(p => {
            const taken = new Set(p.map(t => t.name))
            let name = theme.name
            for (let i = 2; taken.has(name); i++) name = `${theme.name} (${i})`
            return [...p, { ...theme, name }]
          })
        }}
        customFonts={customFonts}
        onAddCustomFont={(rawFamily: string, data: string) => {
          // Filenames become CSS family names, so strip anything that isn't
          // valid in one rather than letting the @font-face filter drop the
          // font later and leave the user wondering why nothing happened.
          const family = rawFamily.replace(/[^\w .'-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64)
          if (!family || !isSafeDataUrl(data)) return
          setCustomFonts(fs => {
            // Re-uploading the same family replaces it rather than shadowing it
            // with a duplicate @font-face rule.
            const next = [...fs.filter(f => f.family !== family), { id: Date.now().toString(), family, data }]
            saveCustomFonts(next)
            return next
          })
          setEditorFontFamily(family)
        }}
        onDeleteCustomFont={(id: string) => {
          setCustomFonts(fs => {
            const gone = fs.find(f => f.id === id)
            const next = fs.filter(f => f.id !== id)
            saveCustomFonts(next)
            // Don't leave the editor pointing at a font that no longer loads.
            if (gone && gone.family === editorFontFamily) setEditorFontFamily(DEFAULT_FONT)
            return next
          })
        }}
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
        currentId={musicTrackId} onCurrentId={setMusicTrackId}
        volume={musicVolume} onVolume={setMusicVolume}
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
