import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const configSchema = z.object({
  REDIS_URL: z.string(),
  REDIS_TOKEN: z.string(),
  NEYNAR_API_KEY: z.string(),
  SIGNER_UUID: z.string(),
  MAX_CAST_LENGTH: z.number(),
  START_CRON_JOB: z.boolean().default(true),
});
const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.SIGNER_UUID;
const START_CRON_JOB = process.env.START_CRON_JOB;

const config = configSchema.parse({
  REDIS_URL,
  REDIS_TOKEN,
  NEYNAR_API_KEY,
  SIGNER_UUID,
  MAX_CAST_LENGTH: 880,
  START_CRON_JOB: START_CRON_JOB === "true",
});

export default config;
