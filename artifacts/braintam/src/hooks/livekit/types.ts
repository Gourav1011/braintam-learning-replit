import type {
  Room,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
} from "livekit-client";

export interface RemoteTrackEntry {
  video?: RemoteTrack;
  audio?: RemoteTrack;
}

export interface LiveKitMediaState {
  room: Room | null;
  connected: boolean;
  cameraPublishing: boolean;
  micPublishing: boolean;
}

export type StageAudioMap = Map<string, HTMLAudioElement>;

export type TrackMap = Map<string, RemoteTrackEntry>;

export {
  Room,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
};
