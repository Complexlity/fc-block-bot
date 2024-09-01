# Farcaster Block Bot

This bot broadcasts on the farcaster network each time a user is blocked by another user.
It also posts a ranking of the most blocked users and the most blockers daily

## Getting Started

1. Clone the repository

```
https://github.com/Complexlity/fc-block-bot.git
cd fc-block-bot
```

2. Install dependencies

```
pnpm install
```

3. Rename `.env.sample` to `.env`

```.env.sample > .env
...
```

4. Get Updated Rankings in your DB

```
pnpm run scrape

```

Optional. But recommended if you want the bot to post rankings.
If you don't, remove START_RANKINGS_JOB=true from .env

5. Run the bot

```
pnpm run dev
```

## Getting a Signer UUID

If you don't have a signer uuid, you can get one with the following steps:

1. Updated .env file with the mnemonic of the bot account.

```.env
...other variables
FARCASTER_DEVELOPER_MNEMONIC=<your_farcaster_developer_mnemonic>
```

2. Install some more dependencies

```
pnpm install @farcaster/hub-nodejs @neynar/nodejs-sdk viem
```

3. Generate Signer UUID

```
pnpm run generate
```

4. Navigate to the generated file `signerUuid.json`

```scripts/signerUuid.json
{
  "signer_uuid": <your-generated-uuid>,
  "public_key": <your-public-key>,
  "status": "pending_approval",
  "signer_approval_url": "https://client.warpcast.com/deeplinks/signed-key-request?token=<your-token>"
}
```

5. Copy the `signer_approval_url`

6. Open the link in your mobile browser on a device with the warpcast app installed and the account ()

7. Approve the request

8. Copy the `signer_uuid` from the url

9. Paste the `signer_uuid` as the value of `SIGNER_UUID`in the .env file

10. Run the bot

```
pnpm run dev
```

> [!NOTE]
> You can remove the extra dependencies once you have a signer.
