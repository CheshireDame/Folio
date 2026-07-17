let chimeCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!chimeCtx) chimeCtx = new AudioContext()
  if (chimeCtx.state === 'suspended') chimeCtx.resume()
  return chimeCtx
}

export function playChime(volume = 0.5) {
  try {
    const ac = getCtx()
    const now = ac.currentTime
    // Two soft sine partials, like a small bell — root + a fifth above.
    const partials: [freq: number, gain: number, delay: number][] = [
      [880, 1,    0],
      [1318.5, 0.5, 0.03],
    ]
    partials.forEach(([freq, g, delay]) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + delay
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(volume * g, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.4)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(start)
      osc.stop(start + 1.5)
    })
  } catch { /* AudioContext not available */ }
}
