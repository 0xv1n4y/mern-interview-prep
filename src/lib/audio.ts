// Records the microphone and returns a small 16 kHz mono WAV (base64), which Gemini can transcribe.
// Works in Chrome, Edge, Firefox and Safari (anything with MediaRecorder + Web Audio).

export const MAX_SECONDS = 90   // keeps the upload well under Vercel's 4.5 MB request limit

export type Recording = {
  stop: () => Promise<{ base64: string; seconds: number }>
  cancel: () => void
}

export async function startRecording(onLevel?: (level: number) => void): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot record audio. Please type your answer.')
  }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch (e) {
    const name = (e as DOMException).name
    if (name === 'NotAllowedError') throw new Error('Microphone is blocked. Click the lock icon in the address bar and allow the microphone.')
    if (name === 'NotFoundError') throw new Error('No microphone was found. Plug one in or type your answer.')
    throw new Error('Could not start the microphone: ' + name)
  }

  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream)
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  recorder.start(250)
  const started = Date.now()

  // Live input level for the little meter.
  const ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  ctx.createMediaStreamSource(stream).connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  let raf = 0
  const tick = () => {
    analyser.getByteTimeDomainData(buf)
    let peak = 0
    for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
    onLevel?.(Math.min(1, peak / 64))
    raf = requestAnimationFrame(tick)
  }
  tick()

  const cleanup = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {}) }

  return {
    cancel() { try { recorder.stop() } catch { /* already stopped */ } cleanup() },
    stop() {
      return new Promise((resolve, reject) => {
        recorder.onstop = async () => {
          cleanup()
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
            const wav = await toWav16k(blob)
            resolve({ base64: await toBase64(wav), seconds: Math.round((Date.now() - started) / 1000) })
          } catch {
            reject(new Error('Could not process the recording. Please try again.'))
          }
        }
        recorder.stop()
      })
    },
  }
}

// Decode whatever the browser recorded, mix to mono, resample to 16 kHz and wrap as 16-bit PCM WAV.
async function toWav16k(blob: Blob): Promise<Blob> {
  const data = await blob.arrayBuffer()
  const decodeCtx = new AudioContext()
  const audio = await decodeCtx.decodeAudioData(data)
  decodeCtx.close().catch(() => {})
  const rate = 16000
  const length = Math.max(1, Math.ceil(audio.duration * rate))
  const offline = new OfflineAudioContext(1, length, rate)
  const src = offline.createBufferSource()
  src.buffer = audio
  src.connect(offline.destination)
  src.start()
  const pcm = (await offline.startRendering()).getChannelData(0)

  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2))
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); out.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true)
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true)
  str(36, 'data'); out.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([out], { type: 'audio/wav' })
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
