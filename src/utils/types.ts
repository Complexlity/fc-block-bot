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

export interface CreateCastResult {
  success: boolean;
  cast:    Cast;
}

export interface Cast {
  hash:   string;
  author: Author;
  text:   string;
}

export interface Author {
  fid: number;
}
