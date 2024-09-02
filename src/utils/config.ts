import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const configSchema = z.object({
  REDIS_URL: z.string(),
  REDIS_TOKEN: z.string(),
  NEYNAR_API_KEY: z.string().default("NEYNAR_API_DOCS"),
  AIRSTACK_API_KEY: z.string().min(1).optional(),
  SIGNER_UUID: z.string(),
  START_CRON_JOB: z.boolean().default(true),
  START_RANKINGS_JOB: z.boolean().default(true),
  FARCASTER_DEVELOPER_MNEMONIC: z.string().optional(),
});
const START_CRON_JOB = process.env.START_CRON_JOB;
const START_RANKINGS_JOB = process.env.START_CRON_JOB;

const config = configSchema.parse({
  ...process.env,
  START_CRON_JOB: START_CRON_JOB === "true",
  START_RANKINGS_JOB: START_RANKINGS_JOB === "true",
});

export default config;
