import { useRef, useEffect, useState } from 'react'
import type { AudioTrack } from '../lib/storage'

interface AudioPlayerProps {
  open: boolean
  tracks: AudioTrack[]
  onAddTrack: (track: AudioTrack) => void
  onRemoveTrack: (id: string) => void
}

export default function AudioPlayer({ open, tracks, onAddTrack, onRemoveTrack }: AudioPlayerProps) {
  const audioRef          = useRef<HTMLAudioElement>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing,   setPlaying]   = useState(false)
  const [volume,    setVolume]    = useState(60)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (!currentId) { a.pause(); return }
    const track = tracks.find(t => t.id === currentId)
    if (!track) { setCurrentId(null); setPlaying(false); return }
    if (a.src !== track.data) a.src = track.data
    if (playing) a.play().catch(() => setPlaying(false))
    else a.pause()
  }, [currentId, playing, tracks])

  const playTrack = (id: string) => {
    if (currentId === id) setPlaying(p => !p)
    else { setCurrentId(id); setPlaying(true) }
  }

  const stop = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    setPlaying(false)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onAddTrack({
      id: Date.now().toString(),
      name: file.name.replace(/\.[^.]+$/, ''),
      data: ev.target?.result as string,
    })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeTrack = (id: string) => {
    if (currentId === id) stop()
    onRemoveTrack(id)
  }

  const currentTrack = tracks.find(t => t.id === currentId)

  return (
    <>
      <audio ref={audioRef} loop />
      {open && (
        <div style={{ position: 'fixed', bottom: 52, left: 16, zIndex: 300, width: 264, background: 'var(--menu-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.55)', userSelect: 'none', '--text': 'var(--menu-text)', '--text2': 'var(--menu-text2)', '--text3': 'var(--menu-text3)' } as React.CSSProperties}>

          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 10 }}>Audio</div>

          {/* Now playing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: playing ? 'var(--accent)' : 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentTrack ? (playing ? '▶ ' : '⏸ ') + currentTrack.name : '—'}
            </span>
            {currentId && (
              <button onClick={stop} title="Stop"
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
              >■ Stop</button>
            )}
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'var(--text3)', width: 24, flexShrink: 0 }}>VOL</span>
            <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'var(--text3)', minWidth: 28, textAlign: 'right' }}>{volume}%</span>
          </div>

          {/* Track list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
            {tracks.length === 0 && (
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>No tracks uploaded yet</div>
            )}
            {tracks.map(t => {
              const active = currentId === t.id
              return (
                <div key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 5, background: active ? 'rgba(196,168,130,0.12)' : 'transparent', cursor: 'pointer' }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(196,168,130,0.12)' : 'transparent' }}
                >
                  <button onClick={() => playTrack(t.id)}
                    style={{ background: 'none', border: 'none', color: active && playing ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer', padding: '0 2px', fontSize: 11, flexShrink: 0, lineHeight: 1 }}>
                    {active && playing ? '⏸' : '▶'}
                  </button>
                  <span onClick={() => playTrack(t.id)}
                    style={{ flex: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: active ? 'var(--text)' : 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  <button onClick={() => removeTrack(t.id)} title="Remove"
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0 2px', fontSize: 10, flexShrink: 0, opacity: 0.5 }}
                    onMouseOver={e => { e.currentTarget.style.color = '#e24b4a'; e.currentTarget.style.opacity = '1' }}
                    onMouseOut={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.opacity = '0.5' }}
                  >✕</button>
                </div>
              )
            })}
          </div>

          {/* Upload */}
          <label
            style={{ display: 'block', padding: '6px 0', border: '1px dashed var(--border)', borderRadius: 5, cursor: 'pointer', textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            + Upload audio
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
        </div>
      )}
    </>
  )
}
