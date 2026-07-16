import { Room, Track } from "livekit-client";

/**
 * Attach local camera to a video element.
 */
export function attachLocalCamera(
  room: Room,
  element: HTMLVideoElement | null
) {
  if (!room || !element) return;

  const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
  if (pub?.track) {
    pub.track.attach(element);
  }
}

/**
 * Enable or disable the local camera.
 */
export async function setCameraEnabled(
  room: Room,
  enabled: boolean
) {
  await room.localParticipant.setCameraEnabled(enabled);
}

/**
 * Enable or disable the local microphone.
 */
export async function setMicrophoneEnabled(
  room: Room,
  enabled: boolean
) {
  await room.localParticipant.setMicrophoneEnabled(enabled);
}

/**
 * Resume browser audio playback.
 */
export async function resumeAudio(room: Room) {
  await room.startAudio();
}
