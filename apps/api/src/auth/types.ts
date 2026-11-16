/** The authenticated caller: a service token's subject, or a signed-in person. */
export interface AuthUser {
  sub: string;
  scopes: string[];
}

/** A signed-in person, from their session cookie. */
export interface SessionUser {
  id: string;
  name: string;
  githubLogin: string;
}

/** What a signed-in person may do: everything. */
export const EDITOR_SCOPES = ["cards:read", "cards:write", "data:admin"];
