export const defaults = {
  BLOCKED_KEY: "blocked_users",
  BLOCKER_KEY: "blocker_users",
  MAX_CAST_LENGTH: 880,
  UNSUBSCRIBERS_KEY: "block-bot-unsubscribers",
  FRAME_URL: "https://fc-block-bot-frame.vercel.app/api",
  CAST_API_URL: "https://api.neynar.com/v2/farcaster/cast",
  BLOCKED_API_URL: "https://api.warpcast.com/fc/blocked-users",
  PIN_CAST_API_URL: "https://client.farcaster.xyz/v2/boost-cast",
  LAST_USER_KEY: "lastBlockedUser",
  CHANNEL_ID: "blockzone",
  BOT_USERNAME: "blockbot"

} as const;
