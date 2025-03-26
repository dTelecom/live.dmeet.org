import { AccessToken } from "@dtelecom/server-sdk-js";
import type { NextApiRequest, NextApiResponse } from "next";
import type { TypeOf } from "zod";
import { z } from "zod";
import { generateUUID } from "@/lib/client-utils";
import { env } from "@/env.mjs";
import requestIp from "request-ip";

const schema = z.object({
  slug: z.string(),
  name: z.string().min(1),
  identity: z.string().optional(),
  isAdmin: z.boolean().optional(),
  wsUrl: z.string().optional()
});

interface ApiRequest extends NextApiRequest {
  body: TypeOf<typeof schema>;
}

export interface IJoinResponse {
  identity: string;
  url: string;
  token: string;
  slug: string;
  roomName: string;
  isAdmin: boolean;
}

export default async function handler(req: ApiRequest, res: NextApiResponse) {
  const input = req.body;
  let identity = input.identity || generateUUID();

  let isAdmin = !!input.identity;

  const token = new AccessToken(env.API_KEY, env.API_SECRET, {
    identity: identity,
    name: input.name
  });

  token.addGrant({
    room: input.slug,
    roomJoin: true,
    canPublish: isAdmin,
    canPublishData: true,
    roomAdmin: isAdmin
  });

  token.webHookURL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/webhook`
    : undefined;

  let url = input.wsUrl;

  if (!url) {
    const clientIp = requestIp.getClientIp(req) || undefined;
    url = await token.getWsUrl(clientIp);
  }

  res.status(200).json({
    identity,
    url,
    token: token.toJwt(),
    slug: input.slug,
    isAdmin
  });
}
