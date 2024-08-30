import axios from "axios";
import config from "./config.js";
import { NeynarUsersFetchResult } from "./types.js";
const CAST_API_URL = "https://api.neynar.com/v2/farcaster/cast";

export async function createCast(text: string) {
  const body = {
    signer_uuid: config.SIGNER_UUID,
    text,
  };

  const headers = {
    accept: "application/json",
    api_key: config.NEYNAR_API_KEY,
  };
  try {
    const res = await axios.post(CAST_API_URL, body, {
      headers,
    });
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
