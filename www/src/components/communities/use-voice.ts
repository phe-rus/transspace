import type { VoiceSignalData } from "@/data/live-room"
import { getTurnCredentials } from "@/domains/guides"
import { useCallback, useEffect, useRef, useState } from "react"
import type { useLiveRoom } from "./use-live-room"

type LiveRoomHandle = ReturnType<typeof useLiveRoom>

type Peer = {
  pc: RTCPeerConnection
  audio: HTMLAudioElement
  // candidates that arrived before the other side's description
  pending: RTCIceCandidateInit[]
}

export type VoiceProblem = "mic" | "setup"

// relay credentials live an hour; fetch new ones well before that
const ICE_REFRESH_MS = 50 * 60 * 1000

// voice in a community's live room (spec 0010 AC-14, AC-15): a mesh of up
// to 6 browsers, every connection forced through the TURN relay, so no one
// ever learns another person's IP address. The room only keeps the seats
// and passes signals; audio never touches it and nothing is recorded
export function useVoice(
  slug: string | null,
  room: LiveRoomHandle,
  onProblem: (problem: VoiceProblem) => void
) {
  // this page is taking part in voice (seated, or waiting in line)
  const [active, setActive] = useState(false)
  // bumped when a connection failed, so the mesh is rebuilt
  const [rebuild, setRebuild] = useState(0)
  // the audio being heard, for the speaking animation: this person's own
  // mic and each other seated person's incoming stream
  const [streams, setStreams] = useState<Map<string, MediaStream>>(new Map())
  const activeRef = useRef(false)
  const joiningRef = useRef(false)
  const localRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<string, Peer>())
  const iceRef = useRef<{ servers: RTCIceServer[]; fetchedAt: number } | null>(null)
  const onProblemRef = useRef(onProblem)
  onProblemRef.current = onProblem

  const voice = room.voice
  const me = voice?.you
  const mySeat = voice?.seats.find((seat) => seat.userLinkId === me) ?? null
  const inLine = Boolean(
    me && (voice?.waiting.includes(me) || voice?.offer?.userLinkId === me)
  )
  const send = room.send

  const closePeer = useCallback((userLinkId: string) => {
    const peer = peersRef.current.get(userLinkId)
    if (!peer) return
    peer.pc.close()
    peer.audio.srcObject = null
    peersRef.current.delete(userLinkId)
    setStreams((current) => {
      if (!current.has(userLinkId)) return current
      const next = new Map(current)
      next.delete(userLinkId)
      return next
    })
  }, [])

  const teardown = useCallback(() => {
    for (const id of [...peersRef.current.keys()]) closePeer(id)
    localRef.current?.getTracks().forEach((track) => track.stop())
    localRef.current = null
    setStreams(new Map())
    joiningRef.current = false
    activeRef.current = false
    setActive(false)
  }, [closePeer])

  const ensureIce = useCallback(async () => {
    const cached = iceRef.current
    if (cached && Date.now() - cached.fetchedAt < ICE_REFRESH_MS) {
      return cached.servers
    }
    if (!slug) throw new Error("Not in a room")
    const result: unknown = await getTurnCredentials({ data: { slug } })
    // a refusal (403 no seat, 503 not set up or paused) may come back as
    // a Response value rather than a throw
    if (result instanceof Response || !result) throw result
    const { iceServers } = result as { iceServers: RTCIceServer[] }
    iceRef.current = { servers: iceServers, fetchedAt: Date.now() }
    return iceServers as RTCIceServer[]
  }, [slug])

  const createPeer = useCallback(
    (userLinkId: string, servers: RTCIceServer[]): Peer => {
      const existing = peersRef.current.get(userLinkId)
      if (existing) return existing
      const pc = new RTCPeerConnection({
        iceServers: servers,
        // never a direct path: only relay candidates are gathered or used
        iceTransportPolicy: "relay",
      })
      localRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localRef.current!))
      const audio = new Audio()
      audio.autoplay = true
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track])
        audio.srcObject = stream
        audio.play().catch(() => {})
        setStreams((current) => new Map(current).set(userLinkId, stream))
      }
      pc.onicecandidate = (event) => {
        send({
          type: "voice.signal",
          to: userLinkId,
          data: { candidate: event.candidate ? event.candidate.toJSON() : null },
        })
      }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          closePeer(userLinkId)
          setRebuild((count) => count + 1)
        }
      }
      const peer: Peer = { pc, audio, pending: [] }
      peersRef.current.set(userLinkId, peer)
      return peer
    },
    [closePeer, send]
  )

  const sendDescription = useCallback(
    (userLinkId: string, pc: RTCPeerConnection) => {
      const description = pc.localDescription
      if (!description) return
      send({
        type: "voice.signal",
        to: userLinkId,
        data: { description: { type: description.type, sdp: description.sdp } },
      })
    },
    [send]
  )

  // keep the mesh matching the seats: one connection per other seated
  // person, the one with the smaller id makes the offer
  useEffect(() => {
    if (!active || !voice || !me) return
    if (mySeat || inLine) joiningRef.current = false
    if (!mySeat) {
      for (const id of [...peersRef.current.keys()]) closePeer(id)
      // not seated, not in line, not on the way in: voice is over for us
      if (!inLine && !joiningRef.current) teardown()
      return
    }
    // a muted seat stops sending; the room's word is final
    localRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !mySeat.muted
    })
    if (mySeat.held) return

    let cancelled = false
    const others = voice.seats.filter(
      (seat) => seat.userLinkId !== me && !seat.held
    )
    const otherIds = new Set(others.map((seat) => seat.userLinkId))
    for (const id of [...peersRef.current.keys()]) {
      if (!otherIds.has(id)) closePeer(id)
    }
    ;(async () => {
      let servers: RTCIceServer[]
      try {
        servers = await ensureIce()
      } catch {
        if (cancelled) return
        onProblemRef.current("setup")
        send({ type: "voice.leave" })
        teardown()
        return
      }
      if (cancelled) return
      for (const seat of others) {
        const isNew = !peersRef.current.has(seat.userLinkId)
        const peer = createPeer(seat.userLinkId, servers)
        // every page silences a muted seat, so a host's mute holds
        peer.audio.muted = seat.muted
        if (isNew && me < seat.userLinkId) {
          const offer = await peer.pc.createOffer()
          await peer.pc.setLocalDescription(offer)
          sendDescription(seat.userLinkId, peer.pc)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    active,
    voice,
    me,
    mySeat,
    inLine,
    rebuild,
    closePeer,
    createPeer,
    ensureIce,
    send,
    sendDescription,
    teardown,
  ])

  // offers, answers and candidates from the other seated people
  useEffect(() => {
    room.signalHandlerRef.current = (from: string, data: VoiceSignalData) => {
      if (!activeRef.current) return
      void (async () => {
        let peer = peersRef.current.get(from)
        if (data.description) {
          const description = data.description as RTCSessionDescriptionInit
          // a fresh offer from someone we already had a session with means
          // their page started over: start over with them too
          if (description.type === "offer" && peer?.pc.remoteDescription) {
            closePeer(from)
            peer = undefined
          }
          if (!peer) {
            try {
              peer = createPeer(from, await ensureIce())
            } catch {
              return
            }
          }
          await peer.pc.setRemoteDescription(description)
          for (const candidate of peer.pending) {
            await peer.pc.addIceCandidate(candidate).catch(() => {})
          }
          peer.pending = []
          if (description.type === "offer") {
            const answer = await peer.pc.createAnswer()
            await peer.pc.setLocalDescription(answer)
            sendDescription(from, peer.pc)
          }
        } else if (data.candidate && peer) {
          const candidate = data.candidate as RTCIceCandidateInit
          if (peer.pc.remoteDescription) {
            await peer.pc.addIceCandidate(candidate).catch(() => {})
          } else {
            peer.pending.push(candidate)
          }
        }
      })()
    }
    return () => {
      room.signalHandlerRef.current = null
    }
  }, [room.signalHandlerRef, closePeer, createPeer, ensureIce, sendDescription])

  // the chat connection came back: take the held seat (or place) again
  useEffect(() => {
    if (room.connection > 1 && activeRef.current) {
      send({ type: "voice.join" })
    }
  }, [room.connection, send])

  // removed from the room by a moderator: the mic and every connection
  // stop at once, since the room has already dropped the seat
  useEffect(() => {
    if (room.status === "removed") teardown()
  }, [room.status, teardown])

  // leaving the page leaves voice
  useEffect(
    () => () => {
      if (activeRef.current) send({ type: "voice.leave" })
      teardown()
    },
    [send, teardown]
  )

  // the microphone is asked for first, so no one takes a seat they cannot
  // use
  const start = useCallback(
    async (kind: "open" | "join") => {
      if (!localRef.current) {
        try {
          localRef.current = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          })
        } catch {
          onProblemRef.current("mic")
          return
        }
      }
      joiningRef.current = true
      activeRef.current = true
      setActive(true)
      if (me) {
        setStreams((current) => new Map(current).set(me, localRef.current!))
      }
      send({ type: kind === "open" ? "voice.open" : "voice.join" })
    },
    [send, me]
  )

  const leave = useCallback(() => {
    send({ type: "voice.leave" })
    teardown()
  }, [send, teardown])

  const setMuted = useCallback(
    (userLinkId: string, muted: boolean) =>
      send({ type: "voice.mute", userLinkId, muted }),
    [send]
  )

  return { active, mySeat, inLine, streams, start, leave, setMuted, teardown }
}
