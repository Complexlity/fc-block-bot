# Farcaster Block Bot

This bot broadcasts on the farcaster network each time a user is blocked by another user.
It also posts a ranking of the most blocked users and the most blockers daily

## Getting Started

- Clone the repository

```
https://github.com/Complexlity/fc-block-bot.git
cd fc-block-bot
```

- Install dependencies

```
pnpm install
```

- Create a .env file in the root directory and add the following variables:

```.env
NEYNAR_API_KEY=your_neynar_api_key
# Backup for neynar. Can be left blank
See: https://uni-farcaster-sdk.vercel.app/configuration
AIRSTACK_API_KEY=your_airstack_api_key
# DB
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
//Used for creating cast
SIGNER_UUID=<your_fc_signer_uuid>
# Remove or change value if you don't want the cron job running
START_CRON_JOB=true
# Remove or change value if you don't want the rankings job running
START_RANKINGS_JOB=true
# Optional. Backup for neynar. Can be left blank


```

- Get Updated Rankings in your DB

```
pnpm run scrape
```

- Run the bot

```
pnpm run dev
```

## Getting a Signer UUID

If you don't have a signer uuid, you can get one with the following steps:

-Install some more dependencies

```
pnpm install @farcaster/hub-nodejs @neynar/nodejs-sdk viem
```
