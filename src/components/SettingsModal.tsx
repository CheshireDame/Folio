import { useState, useRef } from 'react'
import type { CustomTheme, CustomKeySounds } from '../lib/storage'
import type { SoundType } from '../lib/keyboardSounds'

const ACCENT_PRESETS = ['#c4a882','#d4a0a0','#90b090','#90a8c0','#b0a0d0','#c8906a','#e8c060','#a0c4d0','#d0a0c0','#80c0a0']
const BG_PRESETS = ['#1a1814','#f5f0e8','#1c2128','#1a1f1a','#1e1a26','#0d0d0d','#ffffff','#faf8f4','#1a1a2e','#0f1923']

const LANGS = [
  { code: 'en',    name: 'English' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-AU', name: 'English (AU)' },
  { code: 'fr',    name: 'French' },
  { code: 'es',    name: 'Spanish' },
  { code: 'de',    name: 'German' },
  { code: 'it',    name: 'Italian' },
  { code: 'pt',    name: 'Portuguese' },
  { code: 'pt-BR', name: 'Portuguese (BR)' },
  { code: 'nl',    name: 'Dutch' },
  { code: 'ru',    name: 'Russian' },
  { code: 'pl',    name: 'Polish' },
  { code: 'sv',    name: 'Swedish' },
  { code: 'da',    name: 'Danish' },
  { code: 'no',    name: 'Norwegian' },
  { code: 'fi',    name: 'Finnish' },
  { code: 'tr',    name: 'Turkish' },
  { code: 'uk',    name: 'Ukrainian' },
  { code: 'ar',    name: 'Arabic' },
  { code: 'ja',    name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ko',    name: 'Korean' },
]

interface Theme {
  name: string; bg: string; surface: string; text: string; text2: string
  text3: string; border: string; toolbar: string; accent: string
}

interface SettingsModalProps {
  open: boolean
  themes: Theme[]
  currentTheme: number
  fontSize: number
  editorWidth: number
  lineHeight: number
  accentColor: string
  bgColor: string
  bgImage: string
  bgBlur: number
  bgDim: number
  onClose: () => void
  onTheme: (i: number) => void
  onFontSize: (n: number) => void
  onEditorWidth: (n: number) => void
  onLineHeight: (n: number) => void
  onAccentColor: (s: string) => void
  onBgColor: (s: string) => void
  onBgImage: (s: string) => void
  onBgBlur: (n: number) => void
  onBgDim: (n: number) => void
  showScrollbar: boolean
  onShowScrollbar: (b: boolean) => void
  canvasAlign: 'left' | 'center' | 'right'
  onCanvasAlign: (s: 'left' | 'center' | 'right') => void
  spellCheckLang: string
  onSpellCheckLang: (s: string) => void
  canvasBg: string
  canvasOpacity: number
  canvasBlur: number
  canvasPadding: number
  shadowColor: string
  shadowOpacity: number
  shadowRange: number
  onCanvasBg: (s: string) => void
  onCanvasOpacity: (n: number) => void
  onCanvasBlur: (n: number) => void
  onCanvasPadding: (n: number) => void
  onShadowColor: (s: string) => void
  onShadowOpacity: (n: number) => void
  onShadowRange: (n: number) => void
  accentPresets: string[]
  bgPresets: string[]
  onSaveAccentPreset: () => void
  onDeleteAccentPreset: (i: number) => void
  onSaveBgPreset: () => void
  onDeleteBgPreset: (i: number) => void
  customThemes: CustomTheme[]
  onSaveCustomTheme: (name: string) => void
  onDeleteCustomTheme: (i: number) => void
  onApplyCustomTheme: (t: CustomTheme) => void
  keySounds: boolean
  onKeySounds: (b: boolean) => void
  keySoundsVolume: number
  onKeySoundsVolume: (n: number) => void
  customKeySounds: CustomKeySounds
  onCustomKeySound: (type: SoundType, url: string | null) => void
  onPreviewSound: (type: SoundType) => void
  toolbarColor: string
  onToolbarColor: (s: string) => void
  toolbarTextColor: string
  onToolbarTextColor: (s: string) => void
}

export default function SettingsModal({
  open, themes, currentTheme, fontSize, editorWidth, lineHeight,
  accentColor, bgColor, bgImage, bgBlur, bgDim, showScrollbar, canvasAlign,
  onClose, onTheme, onFontSize, onEditorWidth, onLineHeight,
  onAccentColor, onBgColor, onBgImage, onBgBlur, onBgDim, onShowScrollbar, onCanvasAlign, onSpellCheckLang,
  spellCheckLang,
  canvasBg, canvasOpacity, canvasBlur, canvasPadding, shadowColor, shadowOpacity, shadowRange,
  onCanvasBg, onCanvasOpacity, onCanvasBlur, onCanvasPadding, onShadowColor, onShadowOpacity, onShadowRange,
  accentPresets, bgPresets, onSaveAccentPreset, onDeleteAccentPreset, onSaveBgPreset, onDeleteBgPreset,
  customThemes, onSaveCustomTheme, onDeleteCustomTheme, onApplyCustomTheme,
  keySounds, onKeySounds, keySoundsVolume, onKeySoundsVolume,
  customKeySounds, onCustomKeySound, onPreviewSound,
  toolbarColor, onToolbarColor, toolbarTextColor, onToolbarTextColor,
}: SettingsModalProps) {
  const [saveName, setSaveName]           = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const soundInputRefs = {
    click:     useRef<HTMLInputElement>(null),
    space:     useRef<HTMLInputElement>(null),
    return:    useRef<HTMLInputElement>(null),
    backspace: useRef<HTMLInputElement>(null),
  }

  if (!open) return null

  const label = (text: string) => (
    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 10 }}>{text}</div>
  )

  const slider = (lbl: string, val: number, set: (n:number)=>void, min: number, max: number, step: number, unit = '') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>{lbl}</span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)', minWidth: 44 }}>{val}{unit}</span>
    </div>
  )

  const colorPicker = (lbl: string, val: string, set: (s:string)=>void, presets: string[]) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>{lbl}</span>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: val, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
          <input type="color" value={val} onChange={e => set(e.target.value)} style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
        </div>
        <input type="text" value={val} onChange={e => { if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)) set(e.target.value) }} maxLength={7} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, outline: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, paddingLeft: 130 }}>
        {presets.map(c => (
          <div key={c} onClick={() => set(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: c === val ? '2px solid white' : '2px solid transparent', transition: 'transform 0.1s' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.25)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
        ))}
      </div>
    </div>
  )

  const savedSwatches = (
    presets: string[],
    onSave: () => void,
    onDelete: (i: number) => void,
    onApply: (c: string) => void
  ) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 130, marginBottom: 10, flexWrap: 'wrap' as const }}>
      {presets.map((c, i) => (
        <div key={i} style={{ position: 'relative' as const }}
          onMouseOver={e => { const x = e.currentTarget.querySelector<HTMLElement>('.del'); if (x) x.style.opacity = '1' }}
          onMouseOut={e => { const x = e.currentTarget.querySelector<HTMLElement>('.del'); if (x) x.style.opacity = '0' }}
        >
          <div onClick={() => onApply(c)} title="Apply" style={{ width: 22, height: 22, borderRadius: 5, background: c, cursor: 'pointer', border: '2px solid var(--border)', transition: 'border-color 0.15s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'white'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <button className="del" onClick={() => onDelete(i)} style={{ position: 'absolute' as const, top: -5, right: -5, width: 13, height: 13, borderRadius: '50%', background: '#555', border: 'none', color: '#fff', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', padding: 0 }}>✕</button>
        </div>
      ))}
      <button onClick={onSave} style={{ padding: '2px 8px', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', borderRadius: 4, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
      >+ Save</button>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, color: 'var(--accent)', fontStyle: 'italic', marginBottom: 24 }}>Appearance</div>

        <div style={{ marginBottom: 20 }}>
          {label('Theme')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8, marginBottom: 10 }}>
            {themes.map((t, i) => (
              <div key={t.name} onClick={() => onTheme(i)} style={{ height: 36, borderRadius: 6, background: t.bg, border: i === currentTheme ? '2px solid ' + t.accent : '2px solid ' + t.border, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: t.text2 }}>{t.name}</div>
            ))}
            {customThemes.map((t, i) => (
              <div key={'c' + i}
                onClick={() => onApplyCustomTheme(t)}
                onMouseOver={e => { const x = e.currentTarget.querySelector<HTMLElement>('.del'); if (x) x.style.opacity = '1' }}
                onMouseOut={e => { const x = e.currentTarget.querySelector<HTMLElement>('.del'); if (x) x.style.opacity = '0' }}
                style={{ position: 'relative' as const, height: 36, borderRadius: 6, overflow: 'hidden', border: '2px solid ' + t.border, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {t.bgImage
                  ? <img src={t.bgImage} style={{ position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const, opacity: 0.7 }} alt="" />
                  : <div style={{ position: 'absolute' as const, inset: 0, background: t.bg }} />}
                <span style={{ position: 'relative' as const, zIndex: 1, fontSize: 10, color: t.text2, textShadow: t.bgImage ? '0 1px 3px rgba(0,0,0,0.8)' : 'none' }}>{t.name}</span>
                <button className="del" onClick={e => { e.stopPropagation(); onDeleteCustomTheme(i) }}
                  style={{ position: 'absolute' as const, top: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', padding: 0, zIndex: 2 }}>✕</button>
              </div>
            ))}
          </div>
          {showSaveInput ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input autoFocus type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && saveName.trim()) { onSaveCustomTheme(saveName.trim()); setSaveName(''); setShowSaveInput(false) }
                  if (e.key === 'Escape') { setSaveName(''); setShowSaveInput(false) }
                }}
                placeholder="Theme name…"
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '5px 10px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none' }}
              />
              <button onClick={() => { if (saveName.trim()) { onSaveCustomTheme(saveName.trim()); setSaveName(''); setShowSaveInput(false) } }}
                style={{ padding: '5px 12px', background: 'var(--accent)', border: 'none', color: '#1a1814', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600 }}>Save</button>
              <button onClick={() => { setSaveName(''); setShowSaveInput(false) }}
                style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowSaveInput(true)}
              style={{ padding: '4px 12px', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
            >+ Save current as theme</button>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Colors')}
          {colorPicker('Accent', accentColor, onAccentColor, ACCENT_PRESETS)}
          {savedSwatches(accentPresets, onSaveAccentPreset, onDeleteAccentPreset, c => onAccentColor(c))}
          {colorPicker('Background', bgColor, onBgColor, BG_PRESETS)}
          {savedSwatches(bgPresets, onSaveBgPreset, onDeleteBgPreset, c => onBgColor(c))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12 }}>
            {label('Toolbar')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Toolbar color</span>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: toolbarColor || 'var(--toolbar)', border: '1px solid var(--border)', position: 'relative' as const, overflow: 'hidden', cursor: 'pointer' }}>
                <input type="color" value={toolbarColor || '#15130f'} onChange={e => onToolbarColor(e.target.value)} style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
              </div>
              <input type="text" value={toolbarColor} onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onToolbarColor(e.target.value) }} maxLength={7} placeholder="theme default" style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, outline: 'none' }} />
              {toolbarColor && (
                <button onClick={() => onToolbarColor('')} title="Reset to theme default" style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
                >Reset</button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Toolbar text</span>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: toolbarTextColor || 'var(--text2)', border: '1px solid var(--border)', position: 'relative' as const, overflow: 'hidden', cursor: 'pointer' }}>
                <input type="color" value={toolbarTextColor || '#a09890'} onChange={e => onToolbarTextColor(e.target.value)} style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
              </div>
              <input type="text" value={toolbarTextColor} onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onToolbarTextColor(e.target.value) }} maxLength={7} placeholder="theme default" style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, outline: 'none' }} />
              {toolbarTextColor && (
                <button onClick={() => onToolbarTextColor('')} title="Reset to theme default" style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
                >Reset</button>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Background Image')}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label style={{ flex: 1, padding: '10px 14px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--text3)', textAlign: 'center' as const, letterSpacing: '0.05em', position: 'relative' as const, overflow: 'hidden' as const }}>
              {bgImage ? '✦ Change image' : '+ Upload background image'}
              <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => onBgImage(ev.target?.result as string)
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
              />
            </label>
            {bgImage && (
              <button onClick={() => onBgImage('')} style={{ padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'uppercase' as const }}
                onMouseOver={e => e.currentTarget.style.color = '#e24b4a'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
              >Remove</button>
            )}
          </div>
          {bgImage && (
            <div style={{ borderRadius: 6, overflow: 'hidden', height: 70, marginBottom: 10, position: 'relative' as const }}>
              <img src={bgImage} style={{ width: '100%', height: '100%', objectFit: 'cover' as const, filter: 'blur(' + bgBlur + 'px)', transform: 'scale(1.1)' }} alt="" />
              <div style={{ position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,' + bgDim/100 + ')' }} />
            </div>
          )}
          {slider('Blur', bgBlur, onBgBlur, 0, 20, 1, 'px')}
          {slider('Dim overlay', bgDim, onBgDim, 0, 80, 5, '%')}
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Editor Canvas')}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Canvas color</span>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: canvasBg === 'transparent' ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 0 0 / 8px 8px' : canvasBg, border: '1px solid var(--border)', position: 'relative' as const, overflow: 'hidden', cursor: 'pointer' }}>
                <input type="color" value={canvasBg === 'transparent' ? '#1a1814' : canvasBg} onChange={e => onCanvasBg(e.target.value)} style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
              </div>
              <button onMouseDown={() => onCanvasBg('transparent')} style={{ padding: '4px 10px', background: canvasBg === 'transparent' ? 'rgba(196,168,130,0.2)' : 'transparent', border: '1px solid var(--border)', color: canvasBg === 'transparent' ? 'var(--accent)' : 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>None</button>
            </div>
            {slider('Opacity', canvasOpacity, onCanvasOpacity, 10, 100, 5, '%')}
            {slider('Backdrop blur', canvasBlur, onCanvasBlur, 0, 20, 1, 'px')}
            {slider('Padding', canvasPadding, onCanvasPadding, 0, 80, 4, 'px')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Position</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['left','center','right'] as const).map(a => (
                  <button key={a} onClick={() => onCanvasAlign(a)} style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)', background: canvasAlign === a ? 'rgba(196,168,130,0.2)' : 'transparent', color: canvasAlign === a ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, textTransform: 'capitalize', letterSpacing: '0.05em' }}
                    onMouseOver={e => { if (canvasAlign !== a) e.currentTarget.style.color = 'var(--text)' }}
                    onMouseOut={e => { if (canvasAlign !== a) e.currentTarget.style.color = 'var(--text3)' }}
                  >{a}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Shadow color</span>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: shadowColor, border: '1px solid var(--border)', position: 'relative' as const, overflow: 'hidden', cursor: 'pointer' }}>
                  <input type="color" value={shadowColor} onChange={e => onShadowColor(e.target.value)} style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }} />
                </div>
              </div>
              {slider('Shadow opacity', shadowOpacity, onShadowOpacity, 0, 100, 5, '%')}
              {slider('Shadow range', shadowRange, onShadowRange, 0, 80, 4, 'px')}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Typography & Layout')}
          {slider('Font Size', fontSize, onFontSize, 14, 28, 1, 'px')}
          {slider('Editor Width', editorWidth, onEditorWidth, 400, 900, 10, 'px')}
          {slider('Line Spacing', lineHeight, onLineHeight, 1.4, 2.4, 0.05)}
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Editor Behaviour')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Scrollbar</span>
            <input type="checkbox" checked={showScrollbar} onChange={e => onShowScrollbar(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Show scrollbar in editor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Keyboard sounds</span>
            <input type="checkbox" checked={keySounds} onChange={e => onKeySounds(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Typewriter click on each key</span>
          </div>
          {keySounds && (
            <>
              {slider('Volume', Math.round(keySoundsVolume * 100), v => onKeySoundsVolume(v / 100), 5, 100, 5, '%')}
              <div style={{ marginBottom: 10 }}>
                {(['click', 'space', 'return', 'backspace'] as SoundType[]).map(type => {
                  const hasCustom = !!customKeySounds[type]
                  const names: Record<SoundType, string> = { click: 'Key click', space: 'Space', return: 'Enter', backspace: 'Backspace' }
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)', width: 120, flexShrink: 0 }}>{names[type]}</span>
                      <input
                        ref={soundInputRefs[type]}
                        type="file" accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => onCustomKeySound(type, ev.target?.result as string)
                          reader.readAsDataURL(file)
                          e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => soundInputRefs[type].current?.click()}
                        style={{ padding: '3px 10px', background: hasCustom ? 'rgba(196,168,130,0.15)' : 'transparent', border: '1px solid var(--border)', color: hasCustom ? 'var(--accent)' : 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.05em' }}
                      >{hasCustom ? '✦ custom' : '+ upload'}</button>
                      <button
                        onClick={() => onPreviewSound(type)}
                        title="Preview"
                        style={{ padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}
                      >▶</button>
                      {hasCustom && (
                        <button
                          onClick={() => onCustomKeySound(type, null)}
                          title="Revert to synthesized"
                          style={{ padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 5, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}
                        >✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', width: 120, flexShrink: 0 }}>Spell check</span>
            <select
              value={LANGS.find(l => l.code === spellCheckLang) ? spellCheckLang : ''}
              onChange={e => { if (e.target.value) onSpellCheckLang(e.target.value) }}
              style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 6px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none' }}
            >
              <option value="">— pick —</option>
              {LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <input
              type="text"
              value={spellCheckLang}
              onChange={e => onSpellCheckLang(e.target.value)}
              placeholder="e.g. en-US"
              title="Any BCP 47 language tag"
              style={{ width: 80, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 8px', borderRadius: 5, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, outline: 'none' }}
            />
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Close</button>
      </div>
    </div>
  )
}
