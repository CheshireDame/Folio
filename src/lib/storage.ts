import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'

interface Draft {
  content: string
  savedAt?: string
}

export interface StickyNote {
  id: string
  content: string
  x: number
  viewportY: number
  documentY: number | null
  color: string
  fontSize: number
  minimized?: boolean
}

export interface CustomTheme {
  name: string
  bg: string; surface: string; text: string; text2: string
  text3: string; border: string; toolbar: string; accent: string
  bgImage: string; bgBlur: number; bgDim: number
}

interface FolioData {
  drafts: Record<string, Draft>
  currentDraft: string
  notes: string
  notesSections?: NoteSection[]
  comments?: Comment[]
  stickyNotes?: StickyNote[]
  settings: {
    themeIdx: number
    accentColor: string
    bgColor: string
    bgImage?: string
    bgBlur?: number
    bgDim?: number
    fontSize: number
    editorWidth: number
    lineHeight: number
    wordGoal: number
    typewriterMode?: boolean
    showFormattingBar?: boolean
    canvasBg?: string
    canvasOpacity?: number
    canvasBlur?: number
    shadowColor?: string
    shadowOpacity?: number
    shadowRange?: number
    toolbarOpacity?: number
    canvasPadding?: number
    accentPresets?: string[]
    bgPresets?: string[]
    customThemes?: CustomTheme[]
    showScrollbar?: boolean
    canvasAlign?: 'left' | 'center' | 'right'
    spellCheckLang?: string
    imageMode?: 'text' | 'workspace'
    keySounds?: boolean
    keySoundsVolume?: number
  }
}

async function getDataPath(): Promise<string> {
  const dir = await appDataDir()
  const folioDir = await join(dir, 'Folio')
  const dirExists = await exists(folioDir)
  if (!dirExists) {
    await mkdir(folioDir, { recursive: true })
  }
  return join(folioDir, 'data.json')
}

export async function saveData(data: FolioData): Promise<void> {
  try {
    const path = await getDataPath()
    await writeTextFile(path, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Failed to save:', e)
  }
}

export async function loadData(): Promise<FolioData | null> {
  try {
    const path = await getDataPath()
    const fileExists = await exists(path)
    if (!fileExists) return null
    const text = await readTextFile(path)
    return JSON.parse(text) as FolioData
  } catch (e) {
    console.error('Failed to load:', e)
    return null
  }
}

export interface NoteSection {
  id: string
  title: string
  content: string
  minimized?: boolean
}

export interface Comment {
  id: string
  text: string
  anchored: boolean
}

export interface CustomKeySounds {
  click: string | null
  space: string | null
  return: string | null
  backspace: string | null
}

export interface WorkspaceImage {
  id: string
  src: string
  alt?: string
  x: number
  y: number
  width: number
}

export interface AudioTrack {
  id: string
  name: string
  data: string  // base64 data URL
}

async function getKeySoundsPath(): Promise<string> {
  const dir = await appDataDir()
  const folioDir = await join(dir, 'Folio')
  if (!(await exists(folioDir))) await mkdir(folioDir, { recursive: true })
  return join(folioDir, 'key-sounds.json')
}

const DEFAULT_KEY_SOUNDS: CustomKeySounds = { click: null, space: null, return: null, backspace: null }

export async function saveCustomKeySounds(sounds: CustomKeySounds): Promise<void> {
  try { await writeTextFile(await getKeySoundsPath(), JSON.stringify(sounds)) }
  catch (e) { console.error('Failed to save key sounds:', e) }
}

export async function loadCustomKeySounds(): Promise<CustomKeySounds> {
  try {
    const path = await getKeySoundsPath()
    if (!(await exists(path))) return DEFAULT_KEY_SOUNDS
    return { ...DEFAULT_KEY_SOUNDS, ...JSON.parse(await readTextFile(path)) }
  } catch { return DEFAULT_KEY_SOUNDS }
}

async function getWsImagesPath(): Promise<string> {
  const dir = await appDataDir()
  const folioDir = await join(dir, 'Folio')
  if (!(await exists(folioDir))) await mkdir(folioDir, { recursive: true })
  return join(folioDir, 'workspace-images.json')
}

export async function saveWorkspaceImages(images: WorkspaceImage[]): Promise<void> {
  try {
    await writeTextFile(await getWsImagesPath(), JSON.stringify(images))
  } catch (e) { console.error('Failed to save workspace images:', e) }
}

export async function loadWorkspaceImages(): Promise<WorkspaceImage[]> {
  try {
    const path = await getWsImagesPath()
    if (!(await exists(path))) return []
    return JSON.parse(await readTextFile(path)) as WorkspaceImage[]
  } catch (e) { console.error('Failed to load workspace images:', e); return [] }
}

async function getAudioPath(): Promise<string> {
  const dir = await appDataDir()
  const folioDir = await join(dir, 'Folio')
  const dirExists = await exists(folioDir)
  if (!dirExists) await mkdir(folioDir, { recursive: true })
  return join(folioDir, 'audio.json')
}

export async function saveAudioTracks(tracks: AudioTrack[]): Promise<void> {
  try {
    const path = await getAudioPath()
    await writeTextFile(path, JSON.stringify(tracks))
  } catch (e) {
    console.error('Failed to save audio:', e)
  }
}

export async function loadAudioTracks(): Promise<AudioTrack[]> {
  try {
    const path = await getAudioPath()
    if (!(await exists(path))) return []
    return JSON.parse(await readTextFile(path)) as AudioTrack[]
  } catch (e) {
    console.error('Failed to load audio:', e)
    return []
  }
}

export type { FolioData, Draft }