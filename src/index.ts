import axios, { AxiosError } from "axios";
import { CronJob, timeout } from "cron";
import dotenv from "dotenv";
import config from "./utils/config.js";
import { DEFAULTS } from "./utils/constants.js";
import { createCast, postTopRankings } from "./utils/queries.js";
import { BlockedData, BlockedFetchResult } from "./utils/types.js";
import { kvStore, sdkInstance } from "./utils/services.js";
dotenv.config();

const job = new CronJob(
  //Run every minute
  "* * * * *",
  main,
  null,
  config.START_CRON_JOB,
  "utc"
);

// Post rankings 12:00 PM UTC
const job2 = new CronJob("0 12 * * *", postTopRankings, null, true, "utc");
const BLOCKER_KEY = DEFAULTS.BLOCKER_KEY;
const BLOCKED_KEY = DEFAULTS.BLOCKED_KEY;
const UNSUBSCRIBERS_KEY = DEFAULTS.UNSUBSCRIBERS_KEY;
// const CURSOR_KEY = "lastCursors";

const BLOCKED_API_URL = "https://api.warpcast.com/v1/blocked-users";
const lastUserKey = "lastBlockedUser";

async function main() {
  const lastUser: BlockedData | null = await kvStore.get(lastUserKey);
  console.log("Last user: ", lastUser);
  let fetchedUsers: BlockedData[] = [];
  let cursor: string | null = null;

  while (true) {
    let res;
    try {
      const url = new URL(BLOCKED_API_URL);
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }
      res = await axios.get<BlockedFetchResult>(url.toString());
    } catch (error) {
      handleError(error);
      return;
    }

    const { data } = res;
    const users = data.result.blockedUsers;
    if (!lastUser) {
      console.log("No last user found");
      await processBlockedUsers(users);
      return;
    }

    let lastUserIndex = -1;
    for (let i = 0; i < users.length - 1; i++) {
      const curr = users[i];
      if (
        (curr.blockerFid === lastUser.blockerFid &&
          curr.blockedFid === lastUser.blockedFid &&
          curr.createdAt === lastUser.createdAt) ||
        curr.createdAt < lastUser.createdAt
      ) {
        lastUserIndex = i;
        break;
      }
    }

    console.log("Last user index: ", lastUserIndex);
    if (lastUserIndex !== -1) {
      fetchedUsers.push(...users.slice(0, lastUserIndex));
      break;
    } else {
      fetchedUsers.push(...users);
      if (data.next?.cursor) {
        cursor = data.next.cursor;
      } else {
        break; // No more pages to fetch
      }
    }
  }

  if (fetchedUsers.length > 0) {
    console.log("Fetched users: ", fetchedUsers.length);
    await processBlockedUsers(fetchedUsers);
  } else {
    console.log("No new blocked users found");
  }
}

function handleError(error: unknown) {
  if (error instanceof AxiosError) {
    console.log(error.toJSON());
  } else if (error instanceof Error) {
    console.log(error.message);
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    console.log(error.message);
  } else {
    console.log(error);
  }
}

function getRandomClassifier() {
  const classifiers = [
    " finally",
    " indeed",
    " now",
    " silently",
    " sneakily",
    " eventually",
    " intentionally",
    " angrily",
    "",
  ];
  return classifiers[Math.floor(Math.random() * classifiers.length)];
}

async function processBlockedUsers(blockedData: BlockedData[]) {
  let texts = "";
  let raw = [];
  let mentionedUsers = [];
  const fidsSet = new Set<number>();
  for (const user of blockedData) {
    fidsSet.add(user.blockedFid);
    fidsSet.add(user.blockerFid);
  }
  const fidsArray = [...fidsSet];
  const res = await sdkInstance.getUsersByFid(fidsArray);
  const unsubscribers = await getUnsubscribersFromFids(fidsArray);

  if (res.error) {
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
    mentionedUsers.push(blockerDetails.fid);
    mentionedUsers.push(blockedDetails.fid);
    if (blockerDetails && blockedDetails) {
      const blockerText = getUserTag(blockerDetails, unsubscribers);
      const blockedText = getUserTag(blockedDetails, unsubscribers);
      texts += `${blockerText} has${getRandomClassifier()} blocked ${blockedText}\n`;

      raw.push(user);
    }
    if (
      //Farcaster has a limit of 10 mentioned users per cast and around 100 characters per cast
      texts.length > DEFAULTS.MAX_CAST_LENGTH ||
      mentionedUsers.length == 10
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
    console.log(res);
    if (!!res) {
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
  }
}

function getUserTag(
  user: { fid: number; username: string },
  unsubscribers: Awaited<ReturnType<typeof getUnsubscribersFromFids>>
) {
  const unsubscribed = unsubscribers[user.fid];
  if (unsubscribed) {
    return user.username;
  } else {
    return `@${user.username}`;
  }
}

async function getUnsubscribersFromFids(fids: number[]) {
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
