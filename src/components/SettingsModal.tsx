const ACCENT_PRESETS = ['#c4a882','#d4a0a0','#90b090','#90a8c0','#b0a0d0','#c8906a','#e8c060','#a0c4d0','#d0a0c0','#80c0a0']
const BG_PRESETS = ['#1a1814','#f5f0e8','#1c2128','#1a1f1a','#1e1a26','#0d0d0d','#ffffff','#faf8f4','#1a1a2e','#0f1923']

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
  typewriterMode: boolean
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
  onTypewriter: (b: boolean) => void
  canvasBg: string
  canvasOpacity: number
  canvasBlur: number
  shadowColor: string
  shadowOpacity: number
  shadowRange: number
  onCanvasBg: (s: string) => void
  onCanvasOpacity: (n: number) => void
  onCanvasBlur: (n: number) => void
  onShadowColor: (s: string) => void
  onShadowOpacity: (n: number) => void
  onShadowRange: (n: number) => void
}

export default function SettingsModal({
  open, themes, currentTheme, fontSize, editorWidth, lineHeight,
  accentColor, bgColor, bgImage, bgBlur, bgDim, typewriterMode,
  onClose, onTheme, onFontSize, onEditorWidth, onLineHeight,
  onAccentColor, onBgColor, onBgImage, onBgBlur, onBgDim, onTypewriter,
  canvasBg, canvasOpacity, canvasBlur, shadowColor, shadowOpacity, shadowRange,
  onCanvasBg, onCanvasOpacity, onCanvasBlur, onShadowColor, onShadowOpacity, onShadowRange
}: SettingsModalProps) {
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, color: 'var(--accent)', fontStyle: 'italic', marginBottom: 24 }}>Appearance</div>

        <div style={{ marginBottom: 20 }}>
          {label('Theme')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {themes.map((t, i) => (
              <div key={t.name} onClick={() => onTheme(i)} style={{ height: 36, borderRadius: 6, background: t.bg, border: i === currentTheme ? '2px solid ' + t.accent : '2px solid ' + t.border, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: t.text2 }}>{t.name}</div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Colors')}
          {colorPicker('Accent', accentColor, onAccentColor, ACCENT_PRESETS)}
          {colorPicker('Background', bgColor, onBgColor, BG_PRESETS)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', width: 120 }}>Typewriter mode</span>
          <input type="checkbox" checked={typewriterMode} onChange={e => onTypewriter(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Keep cursor centered</span>
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Close</button>
      </div>
    </div>
  )
}
