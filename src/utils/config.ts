import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const configSchema = z.object({
  REDIS_URL: z.string(),
  REDIS_TOKEN: z.string(),
  NEYNAR_API_KEY: z.string(),
  SIGNER_UUID: z.string(),
  MAX_CAST_LENGTH: z.number(),
});
const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.SIGNER_UUID;

const config = configSchema.parse({
  REDIS_URL,
  REDIS_TOKEN,
  NEYNAR_API_KEY,
  SIGNER_UUID,
  MAX_CAST_LENGTH: 900,
});

export default config;
