import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
} from "livekit-client";

export interface EventManagerOptions {
  room: Room;

  onTrackSubscribed: (
    track: RemoteTrack,
    participant: RemoteParticipant
  ) => void;

  onTrackUnsubscribed: (
    track: RemoteTrack,
    participant: RemoteParticipant
  ) => void;

  onTrackMuted?: (...args: any[]) => void;
  onTrackUnmuted?: (...args: any[]) => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
}

export function registerRoomEvents(opts: EventManagerOptions) {
  const room = opts.room;

  room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    opts.onTrackSubscribed(track as RemoteTrack, participant);
  });

  room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
    opts.onTrackUnsubscribed(track as RemoteTrack, participant);
  });

  if (opts.onTrackMuted) {
    room.on(RoomEvent.TrackMuted, opts.onTrackMuted);
  }

  if (opts.onTrackUnmuted) {
    room.on(RoomEvent.TrackUnmuted, opts.onTrackUnmuted);
  }

  if (opts.onParticipantConnected) {
    room.on(
      RoomEvent.ParticipantConnected,
      opts.onParticipantConnected
    );
  }

  if (opts.onParticipantDisconnected) {
    room.on(
      RoomEvent.ParticipantDisconnected,
      opts.onParticipantDisconnected
    );
  }
}
