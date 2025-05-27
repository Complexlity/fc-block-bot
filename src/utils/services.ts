import { Redis } from "@upstash/redis";
import uniFarcasterSdk from "uni-farcaster-sdk";
import config from "./config.js";

export const sdkInstance = new uniFarcasterSdk({
  neynarApiKey: config.NEYNAR_API_KEY,
  retries: 3,
});

export const kvStore = new Redis({
  url: config.REDIS_URL,
  token: config.REDIS_TOKEN,
});
