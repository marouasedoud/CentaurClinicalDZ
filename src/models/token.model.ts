export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

export interface TokenPayload {
  sub: string; // User ID
  username: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
