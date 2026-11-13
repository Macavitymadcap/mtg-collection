/** The authenticated caller, taken from the verified JWT. */
export interface AuthUser {
  sub: string;
  scopes: string[];
}
