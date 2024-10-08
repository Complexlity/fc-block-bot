import { Redis } from "@upstash/redis";
import axios from "axios";
import uniFarcasterSdk from "uni-farcaster-sdk";
import config from "../src/utils/config";
import { defaults } from "../src/utils/constants";

const sdkInstance = new uniFarcasterSdk({
  neynarApiKey: config.NEYNAR_API_KEY,
  airstackApiKey: config.AIRSTACK_API_KEY,
  retries: 2,
  retryStrategy: "switchTemp",
});

interface BlockedUser {
  blockerFid: number;
  blockedFid: number;
  createdAt: number;
}

interface ApiResponse {
  result: {
    blockedUsers: BlockedUser[];
  };
  next: {
    cursor: string | null;
  };
}

interface UserDetails {
  username: string;
}

const redis = new Redis({
  url: config.REDIS_URL,
  token: config.REDIS_TOKEN,
});

const BLOCKED_KEY = defaults.BLOCKED_KEY;
const BLOCKER_KEY = defaults.BLOCKER_KEY;
const CURSOR_KEY = "lastCursor";

async function scrapeAndStoreData() {
  let cursor: string | null = null;
  let page = 1;
  let totalUsers = 0;
  const BLOCKED_API_URL = defaults.BLOCKED_API_URL;
  do {
    const response = await axios.get<ApiResponse>(BLOCKED_API_URL, {
      params: { cursor },
    });
    const blockedUsers = response.data.result.blockedUsers;
    console.log(response.data.next);
    cursor = response.data.next?.cursor;
    console.log({ currentCursor: cursor });
    totalUsers += blockedUsers.length;
    if (blockedUsers.length === 0) break;
    await storeInRedis(blockedUsers, cursor);
    console.log("data processed", totalUsers);
    console.log("current page", page);
    page++;
  } while (cursor !== null);
}

async function storeInRedis(
  blockedUsers: BlockedUser[],
  currentCursor: string | null
) {
  const multi = redis.multi();
  const userFids = new Set<number>();
  for (const user of blockedUsers) {
    multi.zincrby(BLOCKED_KEY, 1, user.blockedFid.toString());
    multi.zincrby(BLOCKER_KEY, 1, user.blockerFid.toString());
    userFids.add(user.blockerFid);
    userFids.add(user.blockedFid);
  }

  multi.set(CURSOR_KEY, currentCursor);

  await multi.exec();
}

async function getMostBlockedUsers(n: number) {
  const result = await redis.zrange(BLOCKED_KEY, 0, n - 1, {
    withScores: true,
    rev: true,
  });
  console.log("blocked_users", result);
  const blockedRanking: any[] = [];

  for (let i = 0; i < result.length; i++) {
    if (i % 2 === 1) continue;
    const curr = result[i];

    blockedRanking.push({
      fid: curr,
      count: result[i + 1],
    });
  }

  return blockedRanking;
}

async function getMostBlockerUsers(n: number) {
  const result = await redis.zrange(BLOCKER_KEY, 0, n - 1, {
    withScores: true,
    rev: true,
  });

  console.log("blocker_users", result);

  const blockerRanking: any[] = [];
  for (let i = 0; i < result.length; i++) {
    if (i % 2 === 1) continue;
    const curr = result[i];
    blockerRanking.push({
      fid: curr,
      count: result[i + 1],
    });
  }

  return blockerRanking;
}

async function main() {
  try {
    await redis.del(BLOCKED_KEY, BLOCKER_KEY, CURSOR_KEY);
    await scrapeAndStoreData();

    console.log(await getMostBlockedUsers(5));
    console.log(await getMostBlockerUsers(5));
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

await main();
