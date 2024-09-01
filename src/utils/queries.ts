import axios from "axios";
import config from "./config.js";
import { NeynarUsersFetchResult } from "./types.js";
import { DEFAULTS } from "./constants.js";
import { kvStore, sdkInstance } from "./services.js";
const CAST_API_URL = "https://api.neynar.com/v2/farcaster/cast";

async function generateIdempotencyKey(input: string) {
  // Ensure the input is a string
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  // Use the SubtleCrypto API to generate a hash
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  return crypto.subtle.digest("SHA-256", data).then((buffer) => {
    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Return the first 16 characters of the hex string as the idempotency key
    return hashHex.substring(0, 16);
  });
}

export async function createCast(text: string) {
  const idempotencyKey = await generateIdempotencyKey(text);

  const body = {
    signer_uuid: config.SIGNER_UUID,
    text,
    channel_id: "blockzone",
    idem: idempotencyKey,
  };

  const headers = {
    accept: "application/json",
    api_key: config.NEYNAR_API_KEY,
  };
  try {
    const res = await axios.post(CAST_API_URL, body, {
      headers,
    });
    console.log("Cast created successfully");
    return res.data;
  } catch (error) {
    console.error("Error creating cast:", error);
    console.log(error);
    return null;
  }
}

export async function getUsers(fids: number[]) {
  try {
    const users = await axios.get(
      "https://api.neynar.com/v2/farcaster/user/bulk",
      {
        params: {
          fids: fids.join(","),
        },
        headers: {
          accept: "application/json",
          api_key: config.NEYNAR_API_KEY,
        },
      }
    );
    return users.data as NeynarUsersFetchResult;
  } catch (error) {
    console.error("Error fetching users:", error);
    console.log(error);
    return null;
  }
}

async function getMostBlockedUsers(n: number) {
  const result = await kvStore.zrange(DEFAULTS.BLOCKED_KEY, 0, n - 1, {
    withScores: true,
    rev: true,
  });
  const blockedRanking: any[] = [];

  const fids = [];
  for (let i = 0; i < result.length; i++) {
    if (i % 2 === 1) continue;
    const curr = Number(result[i]);
    if (isNaN(curr) || !curr) {
      throw new Error("Invalid fid in blocked users");
    }
    blockedRanking.push({
      fid: curr,
      count: result[i + 1],
    });
    fids.push(curr);
  }
  const users = await sdkInstance.getUsersByFid(fids);
  if (users.error) {
    console.error(users.error.message);
    return null;
  }
  if (blockedRanking.length !== users.data.length) {
    console.error("Length mismatch between blocker users and users");
    return null;
  }

  console.log(blockedRanking);
  console.log(users.data);

  return blockedRanking.map((item) => {
    return {
      user: users.data.find(
        (user) => user.fid === item.fid
      ) as (typeof users.data)[0],
      count: item.count as number,
    };
  });
}

async function getMostBlockerUsers(n: number) {
  const result = await kvStore.zrange(DEFAULTS.BLOCKER_KEY, 0, n - 1, {
    withScores: true,
    rev: true,
  });

  const blockerRanking: any[] = [];
  const fids = [];
  for (let i = 0; i < result.length; i++) {
    if (i % 2 === 1) continue;
    const curr = Number(result[i]);
    if (isNaN(curr) || !curr) {
      throw new Error("Invalid fid in blocked users");
    }

    blockerRanking.push({
      fid: curr,
      count: result[i + 1],
    });
    fids.push(curr);
  }
  const users = await sdkInstance.getUsersByFid(fids);
  if (users.error) {
    console.error(users.error.message);
    return null;
  }
  if (blockerRanking.length !== users.data.length) {
    console.error("Length mismatch between blocker users and users");
    return null;
  }

  return blockerRanking.map((item, index) => {
    return {
      user: users.data.find(
        (user) => user.fid === item.fid
      ) as (typeof users.data)[0],
      count: item.count as number,
    };
  });
}

type T = Awaited<ReturnType<typeof getMostBlockedUsers>>;

function createTopRankingsCast(
  items: T,
  type: "blocked" | "blocker",
  date: string
) {
  if (!items) throw new Error("No items found");

  const blockerTitle = `Most Ruthless Blockers: ${date}\n`;
  const blockedTitle = `Most Blocked Users: ${date}\n`;
  let cast = `${type === "blocked" ? blockedTitle : blockerTitle}`;
  let index = 0;
  for (const item of items) {
    const text = `${index + 1}. @${item.user.username} - ${item.count}\n`;
    cast += text;
    index++;
  }
  return cast;
}

function formatCurrentDate(): string {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");

  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const formattedHours = String(hours).padStart(2, "0");

  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${day}/${month} ${formattedHours}:${minutes} ${ampm}`;
}

export async function postTopRankings() {
  const now = formatCurrentDate();
  const cast1 = createTopRankingsCast(
    await getMostBlockedUsers(5),
    "blocked",
    now
  );
  const cast2 = createTopRankingsCast(
    await getMostBlockerUsers(5),
    "blocker",
    now
  );
  console.log(cast1);
  console.log(cast2);
  // await createCast(cast1);
  // await createCast(cast2);
}
