let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export type SoundType = 'click' | 'space' | 'return' | 'backspace'

const customBuffers: Partial<Record<SoundType, AudioBuffer>> = {}

export async function setCustomSound(type: SoundType, dataUrl: string | null) {
  if (!dataUrl) { delete customBuffers[type]; return }
  try {
    const ac = getCtx()
    const res = await fetch(dataUrl)
    const arr = await res.arrayBuffer()
    customBuffers[type] = await ac.decodeAudioData(arr)
  } catch { delete customBuffers[type] }
}

export function previewSound(type: SoundType, volume: number) {
  try {
    if (customBuffers[type]) playBuffer(customBuffers[type]!, volume)
    else synth(type, volume)
  } catch { /* ignore */ }
}

function playBuffer(buffer: AudioBuffer, volume: number) {
  const ac = getCtx()
  const src = ac.createBufferSource()
  src.buffer = buffer
  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, ac.currentTime)
  src.connect(gain)
  gain.connect(ac.destination)
  src.start()
}

function synth(type: SoundType, vol: number) {
  const ac = getCtx()
  const now = ac.currentTime
  const jitter = Math.random() * 200 - 100
  const duration = type === 'return' ? 0.09 : type === 'space' ? 0.05 : 0.038

  const bufLen = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, bufLen, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1

  const src = ac.createBufferSource()
  src.buffer = buffer

  const bp1 = ac.createBiquadFilter(); bp1.type = 'bandpass'
  const bp2 = ac.createBiquadFilter(); bp2.type = 'bandpass'

  let v = vol
  switch (type) {
    case 'click':
      bp1.frequency.value = 1800 + jitter; bp1.Q.value = 1.2
      bp2.frequency.value =  900 + jitter / 2; bp2.Q.value = 0.6
      break
    case 'space':
      bp1.frequency.value = 1000 + jitter; bp1.Q.value = 0.8
      bp2.frequency.value =  500 + jitter / 2; bp2.Q.value = 0.5
      v *= 0.8; break
    case 'return':
      bp1.frequency.value =  600 + jitter; bp1.Q.value = 0.6
      bp2.frequency.value =  300 + jitter / 2; bp2.Q.value = 0.4
      v *= 1.3; break
    case 'backspace':
      bp1.frequency.value = 1400 + jitter; bp1.Q.value = 1.5
      bp2.frequency.value =  700 + jitter / 2; bp2.Q.value = 0.9
      v *= 0.85; break
  }

  const mix = ac.createGain(); mix.gain.value = 0.5
  const gain = ac.createGain()
  gain.gain.setValueAtTime(v, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  src.connect(bp1); src.connect(bp2)
  bp1.connect(mix); bp2.connect(mix)
  mix.connect(gain); gain.connect(ac.destination)
  src.start(now); src.stop(now + duration + 0.01)
}

function keyType(key: string): SoundType | null {
  if (key === 'Enter') return 'return'
  if (key === 'Backspace' || key === 'Delete') return 'backspace'
  if (key === ' ') return 'space'
  if (key.length === 1 || key === 'Tab') return 'click'
  return null
}

export function playKeySound(key: string, volume: number) {
  try {
    const type = keyType(key)
    if (!type) return
    if (customBuffers[type]) playBuffer(customBuffers[type]!, volume)
    else synth(type, volume)
  } catch { /* AudioContext not available */ }
}
