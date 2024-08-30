export interface BlockedFetchResult {
  result: Result;
  next: Next;
}

export interface Next {
  cursor: string;
}

export interface Result {
  blockedUsers: BlockedData[];
}

export interface BlockedData {
  blockerFid: number;
  blockedFid: number;
  createdAt: number;
}

export interface NeynarUsersFetchResult {
  users: User[];
}

export interface User {
  object: Object;
  fid: number;
  custody_address: string;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: Profile;
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: VerifiedAddresses;
  active_status: ActiveStatus;
  power_badge: boolean;
}

export enum ActiveStatus {
  Inactive = "inactive",
}

export enum Object {
  User = "user",
}

export interface Profile {
  bio: Bio;
}

export interface Bio {
  text: string;
}

export interface VerifiedAddresses {
  eth_addresses: string[];
  sol_addresses: string[];
}
