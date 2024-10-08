//Script that scrapes the last X hours of blocked users from the API and post casts.
//Used when there may be an issue with the bot or the API.

const x = 3;
const X_HOURS_IN_SECONDS = x * 60 * 60;

async function main() {
  let fetchedUsers: BlockedData[] = [];
  let cursor: string | null = null;
  const threeHoursAgo = Math.floor(Date.now() / 1000) - X_HOURS_IN_SECONDS;

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

    const recentUsers = users.filter((user) => user.createdAt > threeHoursAgo);
    fetchedUsers.push(...recentUsers);

    if (users[users.length - 1].createdAt <= threeHoursAgo) {
      // If the last user in this batch is older than 3 hours, we're done
      break;
    }

    if (data.next?.cursor) {
      cursor = data.next.cursor;
    } else {
      break; // No more pages to fetch
    }
  }

  if (fetchedUsers.length > 0) {
    console.log(`Fetched ${fetchedUsers.length} users from the last 3 hours`);

    await processBlockedUsers(fetchedUsers);
  } else {
    console.log("No new blocked users found in the last 3 hours");
  }
}
