import { save as dialogSave, open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import type { CustomTheme, CustomFont, AudioTrack } from './storage'

// A .foliotheme is a self-contained look: the theme itself plus the font and
// music it points at, embedded so the file works on a machine that has never
// seen them. Fonts/music are referenced by name/id inside the app (to keep
// data.json small), which is exactly why they have to be inlined to travel.
export interface ThemeBundle {
  kind: 'folio-theme'
  version: 1
  theme: CustomTheme
  font?: CustomFont | null
  music?: AudioTrack | null
}

export const THEME_EXT = 'foliotheme'

export type ExportThemeResult = { ok: boolean; reason?: 'cancelled' | 'error'; path?: string }
export type ImportThemeResult =
  | { ok: true; bundle: ThemeBundle }
  | { ok: false; reason: 'cancelled' | 'error' | 'invalid' }

// An imported bundle is a file from someone else, so nothing in it is trusted.
// The font family and data URL both get interpolated into a <style> element for
// @font-face; unchecked, a crafted value could close the rule and inject
// arbitrary CSS. Anything failing these checks is dropped rather than repaired.
const SAFE_FAMILY = /^[\w][\w .'-]{0,63}$/
const SAFE_DATA_URL = /^data:[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*;base64,[A-Za-z0-9+/]+={0,2}$/i

export function isSafeFontFamily(family: unknown): family is string {
  return typeof family === 'string' && SAFE_FAMILY.test(family)
}

// `kinds` narrows the MIME type to what the slot actually renders. Nothing here
// executes a text/html payload — CSS url() and <audio> both just fail on one —
// but a font slot has no business accepting anything except a font.
export function isSafeDataUrl(data: unknown, kinds?: string[]): data is string {
  if (typeof data !== 'string' || !SAFE_DATA_URL.test(data)) return false
  if (!kinds) return true
  const mime = data.slice(5, data.indexOf(';')).toLowerCase()
  return kinds.some(k => mime === k || mime.startsWith(k + '/'))
}

// Font files are served under several MIME types depending on who wrote them.
export const FONT_MIMES = ['font', 'application/font-sfnt', 'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf', 'application/octet-stream']

// Colours are not just cosmetic here: they reach `background: var(--bg)` in the
// stylesheet and `style={{ background: t.bg }}` in the theme picker. CSS accepts
// url() in those positions, so a colour field holding
// `url(https://attacker.example/x.png)` turns an imported theme into a beacon
// that fires on open. Only literal #rrggbb is allowed — the same shape the
// colour pickers already enforce on typed input.
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const REQUIRED_COLORS = ['bg', 'surface', 'text', 'text2', 'text3', 'border', 'toolbar', 'accent'] as const

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_COLOR.test(v)
}

// Optional colour: keep it only if it is a real hex value, else use the default.
function color(v: unknown, fallback: string): string {
  return isHexColor(v) ? v : fallback
}

// Numbers reach CSS too (`--editor-font-size: ${fontSize}px`). Coerce and clamp
// rather than trusting whatever the file claims.
function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function isValidTheme(t: unknown): t is CustomTheme {
  if (!t || typeof t !== 'object') return false
  const o = t as Record<string, unknown>
  if (typeof o.name !== 'string') return false
  // A required colour that is not a hex value means the file is corrupt or
  // hostile; reject the whole import rather than guessing a replacement.
  return REQUIRED_COLORS.every(k => isHexColor(o[k]))
}

// Strip anything that fails validation so a bad field costs you the font, not
// the whole import.
function sanitizeBundle(raw: unknown): ThemeBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.kind !== 'folio-theme') return null
  if (!isValidTheme(o.theme)) return null

  const theme = { ...o.theme } as CustomTheme
  // Only inline image data, never a remote URL — a bgImage pointing at
  // https://… would fetch on every launch and report the user's IP.
  if (theme.bgImage && !isSafeDataUrl(theme.bgImage, ['image'])) theme.bgImage = ''

  // Optional colours reach the same url()-accepting CSS positions as the
  // required ones, so they get scrubbed rather than trusted.
  theme.toolbarColor = color(theme.toolbarColor, '')
  theme.toolbarTextColor = color(theme.toolbarTextColor, '')
  theme.shadowColor = color(theme.shadowColor, '#000000')
  // canvasBg has one legal non-hex value.
  theme.canvasBg = theme.canvasBg === 'transparent' ? 'transparent' : color(theme.canvasBg, 'transparent')

  theme.bgBlur = num(theme.bgBlur, 0, 0, 100)
  theme.bgDim = num(theme.bgDim, 0, 0, 100)
  theme.canvasOpacity = num(theme.canvasOpacity, 100, 0, 100)
  theme.canvasBlur = num(theme.canvasBlur, 0, 0, 100)
  theme.shadowOpacity = num(theme.shadowOpacity, 0, 0, 100)
  theme.shadowRange = num(theme.shadowRange, 20, 0, 200)
  theme.fontSize = num(theme.fontSize, 20, 8, 200)
  theme.lineHeight = num(theme.lineHeight, 1.85, 0.5, 5)
  theme.paragraphSpacing = num(theme.paragraphSpacing, 0.8, 0, 10)
  theme.editorWidth = num(theme.editorWidth, 680, 200, 4000)
  theme.themeIdx = num(theme.themeIdx, 0, 0, 4)
  theme.keySoundsVolume = num(theme.keySoundsVolume, 0.3, 0, 1)
  theme.musicVolume = num(theme.musicVolume, 60, 0, 100)

  // Key sounds are played via an <audio> source. A remote URL here would fetch
  // attacker-controlled hosts on every keystroke, reporting the user's IP and
  // roughly when they type. Inline data only.
  if (theme.customKeySounds && typeof theme.customKeySounds === 'object') {
    const ks = theme.customKeySounds as unknown as Record<string, unknown>
    theme.customKeySounds = {
      click: isSafeDataUrl(ks.click, ['audio']) ? ks.click : null,
      space: isSafeDataUrl(ks.space, ['audio']) ? ks.space : null,
      return: isSafeDataUrl(ks.return, ['audio']) ? ks.return : null,
      backspace: isSafeDataUrl(ks.backspace, ['audio']) ? ks.backspace : null,
    }
  } else {
    theme.customKeySounds = undefined
  }

  let font: CustomFont | null = null
  const f = o.font as Record<string, unknown> | undefined | null
  if (f && isSafeFontFamily(f.family) && isSafeDataUrl(f.data, FONT_MIMES)) {
    font = { id: Date.now().toString(), family: f.family, data: f.data }
  }
  // A theme naming a font whose file failed validation would render as Georgia
  // with the wrong name showing; clear it so it falls back cleanly instead.
  if (!font && theme.editorFontFamily && !isSafeFontFamily(theme.editorFontFamily)) {
    theme.editorFontFamily = ''
  }

  let music: AudioTrack | null = null
  const m = o.music as Record<string, unknown> | undefined | null
  if (m && typeof m.name === 'string' && isSafeDataUrl(m.data, ['audio'])) {
    music = { id: typeof m.id === 'string' ? m.id : Date.now().toString(), name: m.name, data: m.data }
  }
  if (!music) theme.musicTrackId = null

  return { kind: 'folio-theme', version: 1, theme, font, music }
}

export async function exportTheme(
  theme: CustomTheme,
  font: CustomFont | null,
  music: AudioTrack | null,
): Promise<ExportThemeResult> {
  try {
    const safeName = theme.name.replace(/[^\w .-]/g, '_') || 'theme'
    const path = await dialogSave({
      filters: [{ name: 'Folio theme', extensions: [THEME_EXT] }],
      defaultPath: `${safeName}.${THEME_EXT}`,
    })
    if (!path) return { ok: false, reason: 'cancelled' }
    const bundle: ThemeBundle = { kind: 'folio-theme', version: 1, theme, font, music }
    await writeTextFile(path, JSON.stringify(bundle))
    return { ok: true, path }
  } catch (e) {
    console.error('Failed to export theme:', e)
    return { ok: false, reason: 'error' }
  }
}

export async function importTheme(): Promise<ImportThemeResult> {
  try {
    const selected = await dialogOpen({
      multiple: false,
      filters: [{ name: 'Folio theme', extensions: [THEME_EXT, 'json'] }],
    })
    const path = Array.isArray(selected) ? selected[0] : selected
    if (!path) return { ok: false, reason: 'cancelled' }
    const bundle = sanitizeBundle(JSON.parse(await readTextFile(path)))
    if (!bundle) return { ok: false, reason: 'invalid' }
    return { ok: true, bundle }
  } catch (e) {
    console.error('Failed to import theme:', e)
    return { ok: false, reason: 'error' }
  }
}
