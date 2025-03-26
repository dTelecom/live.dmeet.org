import type { NextApiRequest, NextApiResponse } from "next";
import type { TypeOf } from "zod";
import { z } from "zod";
import { generateUUID } from "@/lib/client-utils";

const schema = z.object({
  roomName: z.string().min(3)
});

interface ApiRequest extends NextApiRequest {
  body: TypeOf<typeof schema>;
}

export default async function handler(req: ApiRequest, res: NextApiResponse) {
  const identity = generateUUID();
  const slug = generateUUID();

  res.status(200).json({ identity, slug });
}
