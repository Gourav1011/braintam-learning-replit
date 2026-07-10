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

/**
 * Manages a single LiveKit Room connection for the live classroom.
 * - Fetches a backend-minted token scoped to the caller's real, server-verified role.
 * - Attaches the teacher's published video/audio to `teacherVideoRef`.
 * - Exposes camera/mic publish helpers for use by the teacher or a student currently on stage;
 *   LiveKit enforces publish permission server-side, so calls fail silently if not granted.
 */
export function useLiveKit({ sessionId, enabled }: UseLiveKitOpts) {
  const roomRef = useRef<Room | null>(null);
  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const teacherAudioRef = useRef<HTMLAudioElement>(null);
  const [connected, setConnected] = useState(false);
  const [cameraPublishing, setCameraPublishing] = useState(false);
  const [micPublishing, setMicPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [stagePublishers, setStagePublishers] = useState<Set<string>>(new Set());
  // identity -> live video/audio tracks, for rendering arbitrary remote participants (e.g. staged students)
  const tracksByIdentity = useRef<Map<string, { video?: RemoteTrack; audio?: RemoteTrack }>>(new Map());
  const [trackVersion, setTrackVersion] = useState(0);

  const attachTeacherTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && teacherVideoRef.current) {
      track.attach(teacherVideoRef.current);
    } else if (track.kind === Track.Kind.Audio && teacherAudioRef.current) {
      track.attach(teacherAudioRef.current);
    }
  }, []);

  /** Attach a remote participant's currently-known video track (e.g. a staged student) to an element. */
  const attachParticipantVideo = useCallback((identity: string, el: HTMLVideoElement | null) => {
    if (!el) return;
    const entry = tracksByIdentity.current.get(identity);
    if (entry?.video) entry.video.attach(el);
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;
    let room: Room | null = null;

    (async () => {
      try {
        const res = await apiFetch(`/live/${sessionId}/livekit-token`, { method: "POST" });
        if (!res.ok) {
          setError(`LiveKit auth failed (${res.status})`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

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
        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          if (isTeacherRole(safeParseRole(p.metadata))) setTeacherPresent(true);
        });
        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          if (isTeacherRole(safeParseRole(p.metadata))) setTeacherPresent(false);
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
        room.on(RoomEvent.Disconnected, () => setConnected(false));

        await room.connect(data.url as string, data.token as string);
        if (cancelled) {
          room.disconnect();
          return;
        }
        setConnected(true);

        // Attach any teacher tracks already published before we joined.
        room.remoteParticipants.forEach((participant) => {
          if (isTeacherRole(safeParseRole(participant.metadata))) {
            setTeacherPresent(true);
            participant.trackPublications.forEach((pub) => {
              if (pub.track) attachTeacherTrack(pub.track);
            });
          }
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "LiveKit connection failed");
      }
    })();

    return () => {
      cancelled = true;
      room?.disconnect();
      roomRef.current = null;
      setConnected(false);
      setCameraPublishing(false);
      setMicPublishing(false);
      setTeacherPresent(false);
    };
  }, [enabled, sessionId, attachTeacherTrack]);

  /** Enable/disable local camera publish. Server enforces whether this is actually allowed. */
  const setCamera = useCallback(async (on: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(on);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera publish denied");
    }
  }, []);

  /** Enable/disable local microphone publish. Server enforces whether this is actually allowed. */
  const setMic = useCallback(async (on: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(on);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone publish denied");
    }
  }, []);

  return {
    connected,
    cameraPublishing,
    micPublishing,
    teacherPresent,
    error,
    teacherVideoRef,
    teacherAudioRef,
    setCamera,
    setMic,
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
