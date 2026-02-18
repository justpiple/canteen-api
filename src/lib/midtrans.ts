import { Snap, WebhookHandler } from "midtrans-ts-wrapper";
import { env } from "@/env";

const serverKey = env.MIDTRANS_SERVER_KEY;
const clientKey = env.MIDTRANS_CLIENT_KEY;

const isSandbox = clientKey?.includes("SB-");
const apiConfig = {
  isProduction: !isSandbox,
  serverKey: serverKey,
  clientKey: clientKey,
};

export const snapClient = serverKey ? new Snap(apiConfig) : null;
export const webhookHandler = serverKey ? new WebhookHandler(serverKey) : null;
