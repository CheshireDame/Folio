interface ToolbarProps {
  currentDraft: string
  focusMode: boolean
  timerRunning: boolean
  timerOpen: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onExport: () => void
  onTogglePanel: () => void
  onToggleFocus: () => void
  onToggleTimer: () => void
  onOpenSettings: () => void
  onImage: () => void
  onToggleFormattingBar: () => void
  showFormattingBar: boolean
  onNewNote: () => void
  onToggleAudio: () => void
  audioOpen: boolean
  autoHideBars: boolean
  onToggleAutoHideBars: () => void
  imageMode: 'text' | 'workspace'
  onToggleImageMode: () => void
  showSpacing: boolean
  onToggleSpacing: () => void
  showGlyphs: boolean
  onToggleGlyphs: () => void
  currentStage: 1 | 2 | 3
  onStageChange: (s: 1 | 2 | 3) => void
}

export default function Toolbar({
  currentDraft, focusMode, timerRunning, timerOpen,
  onNew, onOpen, onSave, onExport, onTogglePanel,
  onToggleFocus, onToggleTimer,
  onOpenSettings, onImage, onToggleFormattingBar: _ftb, showFormattingBar: _sfb, onNewNote,
  onToggleAudio, audioOpen, autoHideBars, onToggleAutoHideBars, imageMode, onToggleImageMode,
  showSpacing, onToggleSpacing, showGlyphs, onToggleGlyphs,
  currentStage, onStageChange,
}: ToolbarProps) {

  const btn = (label: string, action: () => void, active = false, title?: string) => (
    <button
      key={label}
      onClick={action}
      title={title}
      style={{
        background: active ? 'rgba(128,128,128,0.15)' : 'none',
        border: 'none',
        color: active ? 'var(--accent)' : 'var(--toolbar-text)',
        cursor: 'pointer',
        padding: '5px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.07em',
        whiteSpace: 'nowrap' as const,
        transition: 'color 0.2s',
        flexShrink: 0,
      }}
      onMouseOver={e => { if(!active) e.currentTarget.style.color = 'var(--text)' }}
      onMouseOut={e => { if(!active) e.currentTarget.style.color = 'var(--toolbar-text)' }}
    >
      {label}
    </button>
  )

  const sep = () => (
    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px', flexShrink: 0 }} />
  )

  return (
    <div style={{
      background: 'var(--toolbar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      height: 44,
      gap: 2,
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      <span style={{
        fontFamily: '"Playfair Display", serif',
        fontSize: 15,
        color: 'var(--accent)',
        fontStyle: 'italic',
        marginRight: 14,
        flexShrink: 0,
      }}>
        Folio
      </span>

      {btn('New', onNew)}
      {btn('Open', onOpen)}
      {btn('Save', onSave)}
      {btn('Export', onExport)}
      {sep()}
      {btn('Spacing', onToggleSpacing, showSpacing)}
      {btn('Glyphs', onToggleGlyphs, showGlyphs)}
      {sep()}
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        <button
          onClick={onImage}
          title="Insert image"
          style={{ background: 'none', border: 'none', color: 'var(--toolbar-text)', cursor: 'pointer', padding: '5px 8px', fontSize: 11, fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--toolbar-text)'}
        >Image</button>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <button
          onClick={onToggleImageMode}
          title={imageMode === 'text' ? 'Inline — image inserts into text. Click to switch to Workspace.' : 'Workspace — image floats freely. Click to switch to Inline.'}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '5px 7px', fontSize: 10, fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >{imageMode === 'text' ? 'Inline' : 'Workspace'}</button>
      </div>
      {sep()}
      {btn('Note', onNewNote)}
      {btn('Audio', onToggleAudio, audioOpen)}
      {sep()}
      {btn('Panel', onTogglePanel)}
      {btn('Focus', onToggleFocus, focusMode)}
      {btn('Autohide', onToggleAutoHideBars, autoHideBars)}
      {btn('Timer', onToggleTimer, timerOpen || timerRunning)}
      {sep()}
      {sep()}
      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        {([1, 2, 3] as const).map((s, i) => {
          const labels = ['1·Idea', '2·Org', '3·Write']
          const active = currentStage === s
          return (
            <button
              key={s}
              onClick={() => onStageChange(s)}
              title={['Ideation — scatter your ideas', 'Organize — arrange into blocks', 'Write — clean editor mode'][i]}
              style={{
                background: active ? 'rgba(196,168,130,0.18)' : 'none',
                border: 'none',
                borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                color: active ? 'var(--accent)' : 'var(--toolbar-text)',
                cursor: 'pointer', padding: '5px 9px',
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                whiteSpace: 'nowrap', transition: 'color 0.15s, background 0.15s',
              }}
              onMouseOver={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
              onMouseOut={e => { if (!active) e.currentTarget.style.color = 'var(--toolbar-text)' }}
            >{labels[i]}</button>
          )
        })}
      </div>
      {sep()}
      {btn('Settings', onOpenSettings)}

      <div style={{ flex: 1 }} />
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        color: 'var(--toolbar-text)',
        opacity: 0.6,
        whiteSpace: 'nowrap',
      }}>
        {currentDraft}
      </span>
    </div>
  )
}
