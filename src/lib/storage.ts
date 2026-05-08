import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'

interface Draft {
  content: string
  savedAt?: string
}

interface FolioData {
  drafts: Record<string, Draft>
  currentDraft: string
  notes: string
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
    typewriterMode: boolean
    showFormattingBar?: boolean
    canvasBg?: string
    canvasOpacity?: number
    canvasBlur?: number
    shadowColor?: string
    shadowOpacity?: number
    shadowRange?: number
    toolbarOpacity?: number
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

export type { FolioData, Draft }