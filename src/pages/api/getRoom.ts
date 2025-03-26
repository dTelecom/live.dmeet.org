import type { NextApiRequest, NextApiResponse } from "next";
import type { TypeOf } from "zod";
import { z } from "zod";
import { RoomServiceClient } from "@dtelecom/server-sdk-js";
import { roomParticipants } from "@/pages/api/webhook";

const schema = z.object({
  slug: z.string(),
  identity: z.string(),
  wsUrl: z.string()
});

interface ApiRequest extends NextApiRequest {
  body: TypeOf<typeof schema>;
}

export interface IGetRoomResponse {
  slug: string;
  roomName: string;
  participantsCount?: number;
  roomDeleted: boolean;
  isAdmin: boolean;
}

export default async function handler(req: ApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  let { identity, wsUrl } = req.body;

  let participantsCount = roomParticipants[slug as string] || 0;

  let data: {
    slug?: string;
    participantsCount?: number;
    isAdmin?: boolean;
  } = {
    slug: slug as string,
    participantsCount,
  };

  const svc = new RoomServiceClient(wsUrl, process.env.API_KEY, process.env.API_SECRET);

  svc.authHeader({
    room: slug as string,
    roomAdmin: true
  });

  let participantIdentity = null;
  await svc.getParticipant(slug as string, identity).then((participant) => {
    participantIdentity = participant.identity;
  }).catch((e) => {
    console.log("error", e);
  });
  data = {
    ...data,
    isAdmin: identity === participantIdentity
  };

  res.status(200).json(data);
}
