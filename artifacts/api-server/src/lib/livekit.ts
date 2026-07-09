import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { logger } from "./logger";

const LIVEKIT_URL = process.env["LIVEKIT_URL"];
const LIVEKIT_API_KEY = process.env["LIVEKIT_API_KEY"];
const LIVEKIT_API_SECRET = process.env["LIVEKIT_API_SECRET"];

function assertConfigured(): { url: string; key: string; secret: string } {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit is not configured (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET missing)");
  }
  return { url: LIVEKIT_URL, key: LIVEKIT_API_KEY, secret: LIVEKIT_API_SECRET };
}

let roomServiceClient: RoomServiceClient | null = null;
export function getRoomServiceClient(): RoomServiceClient {
  const { url, key, secret } = assertConfigured();
  if (!roomServiceClient) {
    // RoomServiceClient wants an http(s) URL, not ws(s)
    const httpUrl = url.replace(/^ws/, "http");
    roomServiceClient = new RoomServiceClient(httpUrl, key, secret);
  }
  return roomServiceClient;
}

export interface LiveKitGrantOptions {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
  canPublishScreen: boolean;
  role: string;
}

export async function mintLiveKitToken(opts: LiveKitGrantOptions): Promise<string> {
  const { key, secret } = assertConfigured();
  const at = new AccessToken(key, secret, {
    identity: opts.identity,
    name: opts.name,
    ttl: "6h",
    metadata: JSON.stringify({ role: opts.role }),
  });
  at.addGrant({
    room: opts.roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublish: opts.canPublish,
    canPublishData: true,
    canPublishSources: opts.canPublishScreen
      ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
      : [TrackSource.CAMERA, TrackSource.MICROPHONE],
  });
  return at.toJwt();
}

/** Server-authoritative: flips a participant's publish permission live, without requiring reconnect. */
export async function updateParticipantPublishPermission(
  roomName: string,
  identity: string,
  canPublish: boolean,
): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.updateParticipant(roomName, identity, undefined, {
      canPublish,
      canPublishData: true,
      canSubscribe: true,
    });
  } catch (err) {
    logger.warn({ err, roomName, identity }, "LiveKit updateParticipant failed (participant may not be connected yet)");
  }
}

export async function removeParticipant(roomName: string, identity: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.removeParticipant(roomName, identity);
  } catch (err) {
    logger.warn({ err, roomName, identity }, "LiveKit removeParticipant failed");
  }
}

export function isLiveKitConfigured(): boolean {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}
