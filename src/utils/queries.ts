import axios from "axios";
import config from "./config.js";
import { NeynarUsersFetchResult } from "./types.js";
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
