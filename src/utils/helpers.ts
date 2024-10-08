import { AxiosError } from "axios";
// biome-ignore lint/style/useImportType: <explanation>
import { getMostBlockedUsers, getUnsubscribersFromFids } from "./queries.js";

export async function generateIdempotencyKey(input: string) {
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

type T = Awaited<ReturnType<typeof getMostBlockedUsers>>;

export function createTopRankingsCast(
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

export function formatCurrentDate(): string {
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

export function chunkArray<T>(array: T[], chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function handleError(error: unknown) {
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

export function getRandomClassifier() {
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

export function getUserTag(
  user: { fid: number; username: string },
  unsubscribers: Awaited<ReturnType<typeof getUnsubscribersFromFids>>
) {
  const unsubscribed = unsubscribers[user.fid];
  if (unsubscribed) {
    return user.username;
  }
  return `@${user.username}`;
}
