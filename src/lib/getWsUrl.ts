import { NextApiRequest } from "next";
import requestIp from "request-ip";
import { AccessToken } from "@dtelecom/server-sdk-js";

export const getWsUrl = async (req: NextApiRequest) => {
  const clientIp = requestIp.getClientIp(req) || undefined;
  const token = new AccessToken();
  return await token.getWsUrl(clientIp);
}
