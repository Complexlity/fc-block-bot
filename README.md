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

- Rename `.env.sample` to `.env`

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

:::info
You can remove the extra dependencies once you have a signer
:::
