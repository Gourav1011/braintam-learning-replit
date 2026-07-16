import { RemoteTrack } from "livekit-client";

export function attachRemoteAudio(
  track: RemoteTrack,
  element: HTMLAudioElement
) {
  element.autoplay = true;
  element.muted = false;
  element.volume = 1;

  track.attach(element);

  return element.play().catch((err) => {
    console.warn("[LiveKit] Audio autoplay blocked", err);
    throw err;
  });
}

export function detachRemoteAudio(
  track: RemoteTrack,
  element: HTMLAudioElement
) {
  track.detach(element);
}
