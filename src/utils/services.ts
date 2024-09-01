import uniFarcasterSdk from "uni-farcaster-sdk";
import config from "./config.js";
import { Redis } from "@upstash/redis";

export const sdkInstance = new uniFarcasterSdk({
  neynarApiKey: config.NEYNAR_API_KEY,
  airstackApiKey: config.AIRSTACK_API_KEY,
  retryStrategy: "switchTemp",
  retries: 2,
});

export const kvStore = new Redis({
  url: config.REDIS_URL,
  token: config.REDIS_TOKEN,
});
