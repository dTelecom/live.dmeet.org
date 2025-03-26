import { WebhookReceiver } from "@dtelecom/server-sdk-js";
import type { NextApiRequest, NextApiResponse } from "next";
import jwt_decode from "jwt-decode";
import { getNodeByAddress } from "@dtelecom/server-sdk-js/dist/contract/contract";
import { WebhookEvent } from "@dtelecom/server-sdk-js/dist/proto/livekit_webhook";

export let roomParticipants: Record<string, number> = {};

export interface JwtKey {
  iss: string;
  video: {
    roomAdmin: boolean;
  };
}

const onParticipantJoinedEvent = async (event: WebhookEvent) => {
  if (
    !event.room?.name ||
    !event.participant?.joinedAt ||
    !event.participant?.identity
  )
    return;


  roomParticipants[event.room.name] = !roomParticipants[event.room.name] ? 1 : roomParticipants[event.room.name] + 1;
};

const onParticipantLeftEvent = async (event: WebhookEvent) => {
  if (!event.room?.name || !event.createdAt || !event.participant?.identity)
    return;

  if (roomParticipants[event.room.name] > 0) {
    roomParticipants[event.room.name] = roomParticipants[event.room.name] - 1;
  } else {
    roomParticipants[event.room.name] = 0;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST" && req.headers.authorization) {
    const jwt = jwt_decode<JwtKey>(req.headers.authorization);

    const node = await getNodeByAddress(jwt.iss);

    if (!node) {
      throw new Error("node not found");
    }

    const receiver = new WebhookReceiver(jwt.iss, node.key.replace("0x", ""));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const event = receiver.receive(req.body, req.headers.authorization);

    switch (event.event) {
      case "participant_joined": {
        await onParticipantJoinedEvent(event);

        break;
      }
      case "participant_left": {
        await onParticipantLeftEvent(event);

        break;
      }
    }
  }
  res.status(200).send("ok");
}
