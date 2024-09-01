import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import fs from "fs";
import { ViemLocalEip712Signer } from "@farcaster/hub-nodejs";
import { bytesToHex, hexToBytes } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import config from "../src/utils/config";

const FARCASTER_DEVELOPER_MNEMONIC = config.FARCASTER_DEVELOPER_MNEMONIC;

export const getSignedKey = async () => {
  const createSigner = await neynarClient.createSigner();
  const { deadline, signature } = await generate_signature(
    createSigner.public_key
  );

  if (deadline === 0 || signature === "") {
    throw new Error("Failed to generate signature");
  }

  const fid = await getFid();

  const signedKey = await neynarClient.registerSignedKey(
    createSigner.signer_uuid,
    fid,
    deadline,
    signature
  );

  return signedKey;
};

const generate_signature = async function (public_key: string) {
  const FID = await getFid();

  const account = mnemonicToAccount(FARCASTER_DEVELOPER_MNEMONIC);
  const appAccountKey = new ViemLocalEip712Signer(account as any);

  // Generates an expiration date for the signature (24 hours from now).
  const deadline = Math.floor(Date.now() / 1000) + 86400;

  const uintAddress = hexToBytes(public_key as `0x${string}`);

  const signature = await appAccountKey.signKeyRequest({
    requestFid: BigInt(FID),
    key: uintAddress,
    deadline: BigInt(deadline),
  });

  if (signature.isErr()) {
    return {
      deadline,
      signature: "",
    };
  }

  const sigHex = bytesToHex(signature.value);

  return { deadline, signature: sigHex };
};

const neynarClient = new NeynarAPIClient(config.NEYNAR_API_KEY);

const getFid = async () => {
  const account = mnemonicToAccount(FARCASTER_DEVELOPER_MNEMONIC);

  // Lookup user details using the custody address.
  const { user: farcasterDeveloper } =
    await neynarClient.lookupUserByCustodyAddress(account.address);

  return Number(farcasterDeveloper.fid);
};

const signedKey = await getSignedKey();
fs.writeFileSync("signerUuid.json", JSON.stringify(signedKey, null, 2));
console.log("Signed UUID created in ./scripts/signerUuid.json");
