interface ToolbarProps {
  currentDraft: string
  focusMode: boolean
  timerRunning: boolean
  onNew: () => void
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
}

export default function Toolbar({
  currentDraft, focusMode, timerRunning,
  onNew, onSave, onExport, onTogglePanel,
  onToggleFocus, onToggleTimer,
  onOpenSettings, onImage, onToggleFormattingBar: _ftb, showFormattingBar: _sfb, onNewNote,
  onToggleAudio, audioOpen, autoHideBars, onToggleAutoHideBars, imageMode, onToggleImageMode,
}: ToolbarProps) {

  const btn = (label: string, action: () => void, active = false) => (
    <button
      key={label}
      onClick={action}
      style={{
        background: active ? 'var(--surface)' : 'none',
        border: 'none',
        color: active ? 'var(--accent)' : 'var(--text2)',
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
      onMouseOut={e => { if(!active) e.currentTarget.style.color = 'var(--text2)' }}
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
      {btn('Save', onSave)}
      {btn('Export', onExport)}
      {sep()}
      {btn('Image', onImage)}
      {btn(imageMode === 'text' ? '→text' : '→ws', onToggleImageMode, false)}
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
        color: 'var(--text3)',
        whiteSpace: 'nowrap',
      }}>
        {currentDraft}
      </span>
    </div>
  )
}