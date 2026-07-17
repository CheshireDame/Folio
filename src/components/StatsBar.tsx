interface StatsBarProps {
  words: number
  chars: number
  wordGoal: number
  timer: number
  timerRunning: boolean
  timerPopupOpen: boolean
  focusMode: boolean
  onTimerToggle: () => void
  onTimerReset: () => void
  onGoalChange: (n: number) => void
}

export default function StatsBar({
  words, chars, wordGoal, timer, timerRunning, timerPopupOpen,
  focusMode, onTimerToggle, onTimerReset, onGoalChange
}: StatsBarProps) {
  if (focusMode) return null

  const pct = Math.min(100, Math.round((words / wordGoal) * 100))
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const smallBtn = (label: string, action: () => void) => (
    <button onClick={action} style={{
      background: 'none', border: 'none',
      color: 'var(--toolbar-text)', cursor: 'pointer',
      padding: '2px 6px', borderRadius: 3,
      fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    }}>
      {label}
    </button>
  )

  return (
    <div style={{
      background: 'var(--toolbar)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '0 18px',
      height: 32,
      flexShrink: 0,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 11,
      overflowX: 'auto',
    }}>
      <span style={{ color: 'var(--toolbar-text)', opacity: 0.82, whiteSpace: 'nowrap' }}>
        Words <span style={{ color: 'var(--toolbar-text)', opacity: 1 }}>{words}</span>
      </span>
      <span style={{ color: 'var(--toolbar-text)', opacity: 0.82, whiteSpace: 'nowrap' }}>
        Chars <span style={{ color: 'var(--toolbar-text)', opacity: 1 }}>{chars}</span>
      </span>
      <span style={{ color: 'var(--toolbar-text)', opacity: 0.82, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
        Goal
        <input
          type="number"
          value={wordGoal}
          onChange={e => onGoalChange(Number(e.target.value))}
          style={{
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--toolbar-text)', opacity: 1, width: 50,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            padding: '0 2px', outline: 'none',
          }}
        />
        <span style={{ color: 'var(--toolbar-text)', opacity: 0.82 }}>{pct}%</span>
      </span>
      <div style={{ flex: 1, maxWidth: 100, height: 2, background: 'var(--border)', borderRadius: 1 }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'var(--accent)', borderRadius: 1,
          transition: 'width 0.5s',
        }} />
      </div>
      <div style={{ flex: 1 }} />
      <span style={{ color: 'var(--toolbar-text)', opacity: timerRunning ? 1 : 0.82 }}>
        {fmt(timer)}
      </span>
      {!timerPopupOpen && smallBtn(timerRunning ? 'Pause' : 'Start', onTimerToggle)}
      {!timerPopupOpen && smallBtn('Reset', onTimerReset)}
    </div>
  )
}