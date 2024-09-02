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
