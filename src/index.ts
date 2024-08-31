import { Redis } from "@upstash/redis";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import config from "./utils/config.js";
import { BlockedData, BlockedFetchResult, User } from "./utils/types.js";
import { createCast, getUsers } from "./utils/queries.js";
import { CronJob } from "cron";
import uniFarcasterSdk from "uni-farcaster-sdk";

dotenv.config();

const job = new CronJob(
  //Run every minute
  "* * * * *",
  main,
  null,
  config.START_CRON_JOB,
  "America/Los_Angeles"
);

const sdkInstance = new uniFarcasterSdk({
  neynarApiKey: config.NEYNAR_API_KEY,
});

const kvStore = new Redis({
  url: config.REDIS_URL,
  token: config.REDIS_TOKEN,
});

const BLOCKED_API_URL = "https://api.warpcast.com/v1/blocked-users";
const lastUserKey = "lastBlockedUser";

async function main() {
  const lastUser: BlockedData | null = await kvStore.get(lastUserKey);

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
      const newLastUser = users[0];
      await kvStore.set(lastUserKey, newLastUser);
      processBlockedUsers(users);
      return;
    }

    const lastUserIndex = users.findIndex(
      (user) =>
        user.blockerFid === lastUser.blockerFid &&
        user.blockedFid === lastUser.blockedFid &&
        user.createdAt === lastUser.createdAt
    );

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
    // Save the first user as the new lastUser
    const newLastUser = fetchedUsers[0];
    await kvStore.set(lastUserKey, newLastUser);
    processBlockedUsers(fetchedUsers);
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
    "",
  ];
  return classifiers[Math.floor(Math.random() * classifiers.length)];
}

async function processBlockedUsers(blockedData: BlockedData[]) {
  // Implement your logic here to process the blocked users
  const texts: string[] = [];
  const fidsSet = new Set<number>();
  for (const user of blockedData) {
    fidsSet.add(user.blockedFid);
    fidsSet.add(user.blockerFid);
  }
  const fidsArray = [...fidsSet];
  const res = await sdkInstance.getUsersByFid(fidsArray);
  if (res.error) {
    return null;
  }
  const users = res.data;
  //convert users to an object with fid as key
  const usersObj = users.reduce((acc, user) => {
    //@ts-expect-error
    acc[user.fid] = user;
    return acc;
  }, {}) as { [key: number]: (typeof users)[number] };

  for (const user of blockedData) {
    const blockerDetails = usersObj[user.blockerFid];
    const blockedDetails = usersObj[user.blockedFid];
    if (blockerDetails && blockedDetails) {
      texts.push(
        `@${blockerDetails.username} has${getRandomClassifier()} blocked @${
          blockedDetails.username
        }`
      );
    }
  }

  let textString = texts.join("\n");
  const castedChunks = [];
  while (textString.length > 0) {
    //Break at the closes \n before the 1000 mark
    const index = textString.indexOf("\n", config.MAX_CAST_LENGTH);
    if (index === -1) {
      castedChunks.push(textString);
      break;
    }
    const chunk = textString.slice(0, index);
    castedChunks.push(chunk);
    textString = textString.slice(index + 1);
  }

  //divide text string into chunks of 900 characters
  for (const chunk of castedChunks) {
    console.log({ chunkLength: chunk.length });
    console.log("Creating cast...");
    await createCast(chunk);
  }
}
