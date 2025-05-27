import axios from "axios";
import { CronJob } from "cron";
import dotenv from "dotenv";
import config from "./utils/config.js";
import { postTopRankings, processBlockedUsers } from "./utils/queries.js";
import { handleError } from "./utils/helpers.js";
import { kvStore } from "./utils/services.js";
import type { BlockedData, BlockedFetchResult } from "./utils/types.js";
import { defaults } from "./utils/constants.js";
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

const BLOCKED_API_URL = defaults.BLOCKED_API_URL;
const LAST_USER_KEY = defaults.LAST_USER_KEY;

async function main() {
  const lastUser: BlockedData | null = await kvStore.get(LAST_USER_KEY);
  console.log("Last user: ", lastUser);
  const fetchedUsers: BlockedData[] = [];
  let cursor: string | null = null;

  while (true) {
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
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
    console.log("Last user: ", lastUser);
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
    }
    fetchedUsers.push(...users);
    if (data.next?.cursor) {
      cursor = data.next.cursor;
    } else {
      break; // No more pages to fetch
    }
  }

  console.log("Fetched users: ", fetchedUsers.length);
  if (fetchedUsers.length > 0) {
    console.log("Fetched users: ", fetchedUsers.length);
    await processBlockedUsers(fetchedUsers);
  } else {
    console.log("No new blocked users found");
  }
}
