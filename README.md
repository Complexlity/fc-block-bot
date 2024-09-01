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

- Updated .env file with the mnemonic of the bot account.

```.env
...other variables
FARCASTER_DEVELOPER_MNEMONIC=<your_farcaster_developer_mnemonic>
```

- Install some more dependencies

```
pnpm install @farcaster/hub-nodejs @neynar/nodejs-sdk viem
```

- Generate Signer UUID

```
pnpm run generate
```

- Navigate to the generated file `signerUuid.json`

```scripts/signerUuid.json
{
  "signer_uuid": <your-generated-uuid>,
  "public_key": <your-public-key>,
  "status": "pending_approval",
  "signer_approval_url": "https://client.warpcast.com/deeplinks/signed-key-request?token=<your-token>"
}
```

- Copy the `signer_approval_url`

- Open the link in your mobile browser on a device with the warpcast app installed and the account ()

- Approve the request

- Copy the `signer_uuid` from the url

- Paste the `signer_uuid` as the value of `SIGNER_UUID`in the .env file

- Run the bot

```
pnpm run dev
```
