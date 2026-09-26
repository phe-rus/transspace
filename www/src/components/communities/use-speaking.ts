import { useEffect, useState } from "react"

// how loud (0 to 1, RMS of the waveform) counts as speaking, and how often
// the levels are read
const SPEAKING_LEVEL = 0.04
const SAMPLE_MS = 150

// who is speaking right now, measured in this browser from the audio it
// already has: its own mic and each incoming stream. Nothing is sent
// anywhere; muted people are left out by the caller
export function useSpeaking(streams: Map<string, MediaStream>): Set<string> {
  const [speaking, setSpeaking] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (streams.size === 0) {
      setSpeaking(new Set())
      return
    }
    const context = new AudioContext()
    const meters = [...streams].flatMap(([userLinkId, stream]) => {
      if (stream.getAudioTracks().length === 0) return []
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      // measured only, never routed to the speakers (the <audio> element
      // plays it), so nothing is heard twice
      context.createMediaStreamSource(stream).connect(analyser)
      return [{ userLinkId, analyser, data: new Uint8Array(analyser.fftSize) }]
    })

    const timer = setInterval(() => {
      const now = new Set<string>()
      for (const { userLinkId, analyser, data } of meters) {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const value of data) {
          const centered = (value - 128) / 128
          sum += centered * centered
        }
        if (Math.sqrt(sum / data.length) > SPEAKING_LEVEL) now.add(userLinkId)
      }
      setSpeaking((current) =>
        current.size === now.size && [...now].every((id) => current.has(id))
          ? current
          : now
      )
    }, SAMPLE_MS)

    return () => {
      clearInterval(timer)
      context.close().catch(() => {})
    }
  }, [streams])

  return speaking
}
