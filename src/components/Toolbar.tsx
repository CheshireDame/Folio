interface ToolbarProps {
  currentDraft: string
  focusMode: boolean
  timerRunning: boolean
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
}

export default function Toolbar({
  currentDraft, focusMode, timerRunning,
  onNew, onOpen, onSave, onExport, onTogglePanel,
  onToggleFocus, onToggleTimer,
  onOpenSettings, onImage, onToggleFormattingBar: _ftb, showFormattingBar: _sfb, onNewNote,
  onToggleAudio, audioOpen, autoHideBars, onToggleAutoHideBars, imageMode, onToggleImageMode,
  showSpacing, onToggleSpacing, showGlyphs, onToggleGlyphs,
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
      {btn('Image', onImage)}
      {btn(imageMode === 'text' ? '→text' : '→ws', onToggleImageMode, false,
        imageMode === 'text'
          ? 'Images insert into the text flow. Click to switch to workspace mode (free-floating).'
          : 'Images are placed as free-floating objects on the workspace. Click to switch to text mode.')}
      {sep()}
      {btn('Note', onNewNote)}
      {btn('Audio', onToggleAudio, audioOpen)}
      {sep()}
      {btn('Panel', onTogglePanel)}
      {btn('Focus', onToggleFocus, focusMode)}
      {btn('Autohide', onToggleAutoHideBars, autoHideBars)}
      {btn('Timer', onToggleTimer, timerRunning)}
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
