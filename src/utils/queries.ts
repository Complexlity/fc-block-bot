import type { DataOrError, User, uniFarcasterSdk } from "uni-farcaster-sdk";
import config from "./config.js";
import { defaults } from "./constants.js";
import {
  chunkArray,
  createTopRankingsCast,
  delay,
  formatCurrentDate,
  generateIdempotencyKey,
  getRandomClassifier,
  getUserTag,
  handleError,
} from "./helpers.js";
import { kvStore, sdkInstance } from "./services.js";
import type { BlockedData, CreateCastResult } from "./types.js";
const BLOCKER_KEY = defaults.BLOCKER_KEY;
const BLOCKED_KEY = defaults.BLOCKED_KEY;
const UNSUBSCRIBERS_KEY = defaults.UNSUBSCRIBERS_KEY;
const CAST_API_URL = defaults.CAST_API_URL;
const CHANNEL_ID = defaults.CHANNEL_ID;
const PIN_CAST_API_URL = defaults.PIN_CAST_API_URL;
const BOT_USERNAME = defaults.BOT_USERNAME
const lastUserKey = defaults.LAST_USER_KEY;


export async function getMostBlockedUsers(n: number) {
  const result = await kvStore.zrange(defaults.BLOCKED_KEY, 0, n - 1, {
    withScores: true,
    rev: true,
  });
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const blockedRanking: any[] = [];

  const fids = [];
  for (let i = 0; i < result.length; i++) {
    if (i % 2 === 1) continue;
    const curr = Number(result[i]);
    if (Number.isNaN(curr) || !curr) {
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
  const result = await kvStore.zrange(defaults.BLOCKER_KEY, 0, n - 1, {
    withScores: true,
    rev: true,
  });

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const blockerRanking: any[] = [];
  const fids = [];
  for (let i = 0; i < result.length; i++) {
    if (i % 2 === 1) continue;
    const curr = Number(result[i]);
    if (Number.isNaN(curr) || !curr) {
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

export async function postTopRankings(topX = 10) {
  const now = formatCurrentDate();
  const cast1 = createTopRankingsCast(
    await getMostBlockedUsers(topX),
    "blocked",
    now
  );
  const cast2 = createTopRankingsCast(
    await getMostBlockerUsers(topX),
    "blocker",
    now
  );

  const [mostBlockers, mostBlocked] = await Promise.all([createCast(cast2), createCast(cast1)]);
  if (mostBlockers) {
    // Pin most blockers cast to CHANNEL_ID
    await boostCast(mostBlockers.cast.hash, true).then(async () => {
      if (mostBlocked) {
        //Quote most blocked cast as a reply to mostBlockers cast
        const text = `https://farcaster.xyz/${BOT_USERNAME}/${mostBlocked.cast.hash}`;
        await createCast(text, {
          parent: mostBlockers.cast.hash,
        })
      }
    }).catch((error) => {
      console.error("Error boosting most blockers cast:", error);
    }
    );
  }

}

async function boostCast(castHash: string, notifyChannelMembers = false) {
  const response = await fetch(PIN_CAST_API_URL, {
    method: "PUT",
    headers: {
      "accept": "*/*",
      "authorization": `Bearer ${config.WARPCAST_AUTH_TOKEN}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      castHash,
      notifyChannelMembers,
    }),
  });

  if (!response.ok) {
    console.log(response.status);
    throw new Error(`Failed to boost cast: ${response.statusText}`);
  }

  return response.json();
}

export async function getUsersChunked(
  sdkInstance: uniFarcasterSdk,
  fidsArray: number[],
  chunkSize = 10
): Promise<DataOrError<User[]>> {
  const chunks = chunkArray(fidsArray, chunkSize);
  let allUsers: User[] = [];
  let error = null;

  for (const chunk of chunks) {
    try {
      const res = await sdkInstance.getUsersByFid(chunk);
      if (res.error) {
        error = res.error;
        break;
      }
      if (res.data) {
        allUsers = allUsers.concat(res.data);
      }
    } catch (err) {
      if (err && typeof err === "object" && "message" in err && err.message) {
        error = { message: err.message };
      }
      error = { message: "Something went wrong fetching users" };
      break;
    }

    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await delay(2000); // 2 second delay between chunks
    }
  }

  if (error) {
    return {
      error,
      data: null,
    };
  }
  return {
    data: allUsers,
    error,
  };
}

export async function getUnsubscribersFromFids(fids: number[]) {
  const multi = kvStore.multi();
  //For each fid, check user is in unsubscribers list
  for (const fid of fids) {
    multi.sismember(UNSUBSCRIBERS_KEY, fid.toString());
  }
  const res = await multi.exec();

  const unsubscribers = res.map((value, index) => {
    return {
      [fids[index]]: value === 1,
    };
  });

  return unsubscribers;
}

export async function processBlockedUsers(blockedData: BlockedData[]) {
  let texts = "";
  let raw = [];
  let mentionedUsers = [];
  const fidsSet = new Set<number>();
  for (const user of blockedData) {
    fidsSet.add(user.blockedFid);
    fidsSet.add(user.blockerFid);
  }
  const fidsArray = [...fidsSet];

  const res = await getUsersChunked(sdkInstance, fidsArray, 50);
  const unsubscribers = await getUnsubscribersFromFids(fidsArray);
  console.log({ unsubscribers });

  if (res.error) {
    console.log(res.error);
    return null;
  }

  const users = res.data;

  //convert users to an object with fid as key
  const usersObj = users.reduce((acc, user) => {
    acc[user.fid] = user;
    return acc;
  }, {} as { [key: number]: (typeof users)[number] });

  const castedChunks: {
    text: string;
    lastUser: BlockedData;
    raw: BlockedData[];
  }[] = [];
  const reversedBlockedData = [...blockedData].reverse();

  for (const user of reversedBlockedData) {
    const blockerDetails = usersObj[user.blockerFid];
    const blockedDetails = usersObj[user.blockedFid];
    mentionedUsers.push(user.blockerFid);
    mentionedUsers.push(user.blockedFid);
    if (
      (blockerDetails || user.blockerFid) &&
      (blockedDetails || user.blockedFid)
    ) {
      const blockerText = blockerDetails
        ? getUserTag(blockerDetails, unsubscribers)
        : user.blockerFid
          ? `fid:${user.blockerFid}`
          : "unknown";
      const blockedText = blockedDetails
        ? getUserTag(blockedDetails, unsubscribers)
        : user.blockedFid
          ? `fid:${user.blockedFid}`
          : "unknown";
      texts += `${blockerText} has${getRandomClassifier()} blocked ${blockedText}\n`;

      raw.push(user);
    }
    if (
      //Farcaster has a limit of 10 mentioned users per cast and around 1000 characters per cast
      texts.length > defaults.MAX_CAST_LENGTH ||
      mentionedUsers.length === 10
    ) {
      castedChunks.push({
        text: texts,
        lastUser: user,
        raw: raw,
      });
      texts = "";
      mentionedUsers = [];
      raw = [];
    }
  }

  if (texts.length > 0 && reversedBlockedData.length > 0) {
    //Add the last chunk
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const lastUser = reversedBlockedData.at(-1)!;
    castedChunks.push({
      text: texts,
      lastUser,
      raw: raw,
    });
  }
  for (const chunk of castedChunks) {
    console.log("Creating cast...");
    const res = await createCast(chunk.text);

    if (res) {
      const multi = kvStore.multi();
      //cast was created so you can save the last user
      for (const user of chunk.raw) {
        multi.zincrby(BLOCKED_KEY, 1, user.blockedFid.toString());
        multi.zincrby(BLOCKER_KEY, 1, user.blockerFid.toString());
      }
      multi.set(lastUserKey, chunk.lastUser);
      await multi.exec();
    } else {
      return; //Don't do anything if there was an error. Try again next time
    }

    //Wait two seconds before trying to cast again
    await delay(2000);
  }
}


export async function createCast(
  text: string,
  options: { parent?: string; embeds?: { url: string }[] } = {}
) {
  try {
    const idempotencyKey = await generateIdempotencyKey(text);

    const body = {
      signer_uuid: config.SIGNER_UUID,
      text,
      channel_id: CHANNEL_ID,
      idem: idempotencyKey,
      ...options,
    };

    const headers = {
      accept: "application/json",
      api_key: config.NEYNAR_API_KEY,
      "Content-Type": "application/json",
    };

    const res = await fetch(CAST_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorData = await res.json();

      if (res.status === 429 && errorData.code === "RateLimitExceeded") {
        console.warn(
          "Rate limit exceeded. Waiting for 30 seconds before retrying..."
        );
        await delay(60000);
      }

      console.error("Error creating cast:", errorData);
      handleError(new Error(`Request failed with status ${res.status}`));
      return null;
    }

    const data = await res.json() as CreateCastResult;
    console.log("Cast created successfully");
    return data;
  } catch (error) {
    console.error("Error creating cast");
    handleError(error);
    return null;
  }
}
