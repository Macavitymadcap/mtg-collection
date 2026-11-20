/** A problem worth a page of its own, in words a person can act on. */
export interface ErrorDescription {
  title: string;
  message: string;
  /** True when signing in again is the way forward. */
  signInAgain: boolean;
}

const notAllowed: ErrorDescription = {
  title: "Not allowed to sign in",
  message: "That GitHub account isn't allowed to sign in here. Anyone can still browse the collection and decks.",
  signInAgain: false,
};

const expired: ErrorDescription = {
  title: "Sign-in expired",
  message: "That sign-in link has expired or was already used. Start signing in again.",
  signInAgain: true,
};

const githubFailed: ErrorDescription = {
  title: "Couldn't sign in with GitHub",
  message: "GitHub didn't send back what's needed to sign you in. Try again in a moment.",
  signInAgain: true,
};

/** Better Auth's sign-in error codes, plus the site's own. The allowlist refuses by declining to create a user or session. */
const byCode: Record<string, ErrorDescription> = {
  unable_to_create_user: notAllowed,
  unable_to_create_session: notAllowed,
  access_denied: {
    title: "Sign-in cancelled",
    message: "Signing in was cancelled on GitHub, so you're still browsing as a visitor.",
    signInAgain: true,
  },
  state_not_found: expired,
  state_mismatch: expired,
  state_invalid: expired,
  state_security_mismatch: expired,
  please_restart_the_process: expired,
  invalid_code: githubFailed,
  no_code: githubFailed,
  unable_to_get_user_info: githubFailed,
  email_not_found: {
    title: "No email on your GitHub account",
    message: "GitHub didn't share an email address for your account, which signing in needs.",
    signInAgain: false,
  },
};

const unavailable: ErrorDescription = {
  title: "Something's down",
  message: "The site couldn't reach its server or database. Try again in a minute.",
  signInAgain: false,
};

const general: ErrorDescription = {
  title: "Something went wrong",
  message: "That didn't work. Try again, or go back to the home page.",
  signInAgain: false,
};

/**
 * What an error code (e.g. from ?error= after signing in) or an HTTP status
 * means. Unknown codes get a general description.
 */
export function describeError(code: string | null | undefined, status?: number): ErrorDescription {
  const known = code ? byCode[code] : undefined;
  if (known) return known;
  if (status !== undefined && status >= 500) return unavailable;
  return general;
}
