import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
  createLocalTracks,
} from "livekit-client";
import { API_BASE } from "@/lib/api-base";
import { STAFF_TOKEN_KEY, STUDENT_TOKEN_KEY } from "@/components/auth-provider";

function apiFetch(path: string, opts?: RequestInit) {
  const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
  const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);
  const token = studentToken || staffToken;
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

interface UseLiveKitOpts {
  sessionId: string;
  enabled: boolean;
}

export type LiveKitConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

/**
 * Manages a single LiveKit Room connection for the live classroom.
 * - Fetches a backend-minted token scoped to the caller's real, server-verified role.
 * - Attaches the teacher's published video/audio to `teacherVideoRef`.
 * - Exposes camera/mic publish helpers for use by the teacher or a student currently on stage;
 *   LiveKit enforces publish permission server-side, so calls fail silently if not granted.
 * - Runs fully independently of the Socket.IO chat/presence connection: LiveKit media keeps
 *   working while Socket.IO reconnects, and vice versa.
 */
export function useLiveKit({ sessionId, enabled }: UseLiveKitOpts) {
  const roomRef = useRef<Room | null>(null);
  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const teacherAudioRef = useRef<HTMLAudioElement>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<LiveKitConnectionState>("idle");
  const [cameraPublishing, setCameraPublishing] = useState(false);
  const [micPublishing, setMicPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [teacherVideoSubscribed, setTeacherVideoSubscribed] = useState(false);
  const [teacherAudioSubscribed, setTeacherAudioSubscribed] = useState(false);
  const [stagePublishers, setStagePublishers] = useState<Set<string>>(new Set());
  // identity -> live video/audio tracks, for rendering arbitrary remote participants (e.g. staged students)
  const tracksByIdentity = useRef<Map<string, { video?: RemoteTrack; audio?: RemoteTrack }>>(new Map());
  const [trackVersion, setTrackVersion] = useState(0);

  const attachTeacherTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && teacherVideoRef.current) {
      track.attach(teacherVideoRef.current);
      setTeacherVideoSubscribed(true);
    } else if (track.kind === Track.Kind.Audio && teacherAudioRef.current) {
      track.attach(teacherAudioRef.current);
      setTeacherAudioSubscribed(true);
    }
  }, []);

  const detachTeacherTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) {
      if (teacherVideoRef.current) track.detach(teacherVideoRef.current);
      setTeacherVideoSubscribed(false);
    } else if (track.kind === Track.Kind.Audio) {
      if (teacherAudioRef.current) track.detach(teacherAudioRef.current);
      setTeacherAudioSubscribed(false);
    }
  }, []);

  /** Attach a remote participant's currently-known video track (e.g. a staged student) to an element. */
  const attachParticipantVideo = useCallback((identityKey: string, el: HTMLVideoElement | null) => {
    if (!el) return;
    const entry = tracksByIdentity.current.get(identityKey);
    if (entry?.video) entry.video.attach(el);
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setConnectionState("idle");
      return;
    }
    let cancelled = false;
    let room: Room | null = null;
    setConnectionState("connecting");
    setConnectionError(null);
    setTokenError(null);

    (async () => {
      try {
        const res = await apiFetch(`/live/${sessionId}/livekit-token`, { method: "POST" });
        if (!res.ok) {
          let message = `LiveKit auth failed (${res.status})`;
          try {
            const body = await res.json();
            if (typeof body?.error === "string") message = body.error;
          } catch { /* non-JSON error body */ }
          if (cancelled) return;
          setTokenError(message);
          setConnectionError(message);
          setConnectionState("disconnected");
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setRoomName((data.roomName as string) ?? null);
        setIdentity((data.identity as string) ?? null);

        room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track, _pub, participant: RemoteParticipant) => {
          const entry = tracksByIdentity.current.get(participant.identity) ?? {};
          if (track.kind === Track.Kind.Video) entry.video = track;
          else if (track.kind === Track.Kind.Audio) entry.audio = track;
          tracksByIdentity.current.set(participant.identity, entry);
          setTrackVersion(v => v + 1);
          setStagePublishers(prev => new Set(prev).add(participant.identity));

          const isTeacher = isTeacherRole(safeParseRole(participant.metadata));
          if (isTeacher) {
            setTeacherPresent(true);
            attachTeacherTrack(track);
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant: RemoteParticipant) => {
          const isTeacher = isTeacherRole(safeParseRole(participant.metadata));
          if (isTeacher) detachTeacherTrack(track);

          const entry = tracksByIdentity.current.get(participant.identity);
          if (entry) {
            if (track.kind === Track.Kind.Video) delete entry.video;
            else if (track.kind === Track.Kind.Audio) delete entry.audio;
            if (!entry.video && !entry.audio) {
              tracksByIdentity.current.delete(participant.identity);
              setStagePublishers(prev => {
                const next = new Set(prev);
                next.delete(participant.identity);
                return next;
              });
            }
          }
          setTrackVersion(v => v + 1);
        });
        room.on(RoomEvent.TrackMuted, (pub, participant) => {
          const isTeacher = isTeacherRole(safeParseRole(participant.metadata));
          if (isTeacher) {
            if (pub.kind === Track.Kind.Video) setTeacherVideoSubscribed(false);
            else if (pub.kind === Track.Kind.Audio) setTeacherAudioSubscribed(false);
          }
          setTrackVersion(v => v + 1);
        });
        room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
          const isTeacher = isTeacherRole(safeParseRole(participant.metadata));
          if (isTeacher && pub.track) attachTeacherTrack(pub.track as RemoteTrack);
          setTrackVersion(v => v + 1);
        });
        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          if (isTeacherRole(safeParseRole(p.metadata))) setTeacherPresent(true);
        });
        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          if (isTeacherRole(safeParseRole(p.metadata))) {
            setTeacherPresent(false);
            setTeacherVideoSubscribed(false);
            setTeacherAudioSubscribed(false);
          }
          tracksByIdentity.current.delete(p.identity);
          setStagePublishers(prev => {
            const next = new Set(prev);
            next.delete(p.identity);
            return next;
          });
          setTrackVersion(v => v + 1);
        });
        room.on(RoomEvent.LocalTrackPublished, () => {
          const lp: LocalParticipant = room!.localParticipant;
          setCameraPublishing(lp.isCameraEnabled);
          setMicPublishing(lp.isMicrophoneEnabled);
        });
        room.on(RoomEvent.LocalTrackUnpublished, () => {
          const lp: LocalParticipant = room!.localParticipant;
          setCameraPublishing(lp.isCameraEnabled);
          setMicPublishing(lp.isMicrophoneEnabled);
        });
        room.on(RoomEvent.Reconnecting, () => setConnectionState("reconnecting"));
        room.on(RoomEvent.Reconnected, () => setConnectionState("connected"));
        room.on(RoomEvent.Disconnected, () => {
          setConnected(false);
          setConnectionState("disconnected");
        });
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioBlocked(!room!.canPlaybackAudio);
        });

        await room.connect(data.url as string, data.token as string);
        if (cancelled) {
          room.disconnect();
          return;
        }
        setConnected(true);
        setConnectionState("connected");
        setAudioBlocked(!room.canPlaybackAudio);

        // Attach any tracks already published before we joined.
        room.remoteParticipants.forEach((participant) => {
          const isTeacher = isTeacherRole(safeParseRole(participant.metadata));
          if (isTeacher) {
            setTeacherPresent(true);
            participant.trackPublications.forEach((pub) => {
              if (pub.track) attachTeacherTrack(pub.track);
            });
          } else {
            // Seed stage publishers for non-teacher participants already streaming.
            // Without this, students joining after a stage student started publishing
            // would never see the stage video (they missed the TrackSubscribed event).
            const entry: { video?: RemoteTrack; audio?: RemoteTrack } = {};
            let hasTrack = false;
            participant.trackPublications.forEach((pub) => {
              if (pub.isSubscribed && pub.track) {
                if (pub.track.kind === Track.Kind.Video) { entry.video = pub.track as RemoteTrack; hasTrack = true; }
                else if (pub.track.kind === Track.Kind.Audio) { entry.audio = pub.track as RemoteTrack; hasTrack = true; }
              }
            });
            if (hasTrack) {
              tracksByIdentity.current.set(participant.identity, entry);
              setStagePublishers(prev => new Set(prev).add(participant.identity));
              setTrackVersion(v => v + 1);
            }
          }
        });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "LiveKit connection failed";
          setError(message);
          setConnectionError(message);
          setConnectionState("disconnected");
        }
      }
    })();

    return () => {
      cancelled = true;
      room?.disconnect();
      roomRef.current = null;
      setConnected(false);
      setConnectionState("idle");
      setCameraPublishing(false);
      setMicPublishing(false);
      setTeacherPresent(false);
      setTeacherVideoSubscribed(false);
      setTeacherAudioSubscribed(false);
    };
  }, [enabled, sessionId, attachTeacherTrack, detachTeacherTrack]);

  /**
   * Attach the LiveKit local camera track to a video element.
   * Call this after setCamera(true) resolves so the teacher sees their own feed
   * without a separate getUserMedia stream competing for the camera device.
   */
  const attachLocalCameraTo = useCallback((el: HTMLVideoElement | null) => {
    const room = roomRef.current;
    if (!el || !room) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) pub.track.attach(el);
  }, []);

  /** Enable/disable local camera publish. Server enforces whether this is actually allowed. */
  const setCamera = useCallback(async (on: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    setCameraError(null);
    try {
      await room.localParticipant.setCameraEnabled(on);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera permission was denied.";
      setCameraError(message);
      setError(message);
    }
  }, []);

  /** Enable/disable local microphone publish. Server enforces whether this is actually allowed. */
  const setMic = useCallback(async (on: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    setMicrophoneError(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(on);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Microphone permission was denied.";
      setMicrophoneError(message);
      setError(message);
    }
  }, []);

  /** Unlocks browser-blocked autoplay audio for all subscribed remote audio tracks. */
  const startAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Class audio was blocked by the browser.");
    }
  }, []);

  return {
    connected,
    connectionState,
    cameraPublishing,
    micPublishing,
    teacherPresent,
    teacherVideoSubscribed,
    teacherAudioSubscribed,
    error,
    connectionError,
    tokenError,
    cameraError,
    microphoneError,
    audioBlocked,
    startAudio,
    roomName,
    identity,
    teacherVideoRef,
    teacherAudioRef,
    setCamera,
    setMic,
    attachLocalCameraTo,
    stagePublishers,
    trackVersion,
    attachParticipantVideo,
  };
}

function safeParseRole(metadata: string | undefined): string | null {
  if (!metadata) return null;
  try {
    return (JSON.parse(metadata) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

// The instructor broadcasting into a class isn't always role="teacher" — admins/super_admins
// can also be assigned as the live instructor. Treat any of these as "the teacher" for display.
function isTeacherRole(role: string | null): boolean {
  return role === "teacher" || role === "admin" || role === "super_admin";
}

export { createLocalTracks };
