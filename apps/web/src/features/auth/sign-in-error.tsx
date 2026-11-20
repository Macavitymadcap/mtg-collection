"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { useSnackbar } from "@/components/feedback/snackbar-provider";

/** What Better Auth's error codes mean here. The allowlist refuses by declining to create the user or session. */
const messages: Record<string, string> = {
  unable_to_create_user: "That GitHub account isn't allowed to sign in here.",
  unable_to_create_session: "That GitHub account isn't allowed to sign in here.",
  access_denied: "Sign-in was cancelled on GitHub.",
};

/** The message for a failed sign-in's error code. */
export function signInErrorMessage(code: string): string {
  return messages[code] ?? "Couldn't sign in. Try again.";
}

/**
 * After a failed sign-in, GitHub's round trip ends back on the page with
 * ?error=<code>. Shows why, then takes the code out of the address.
 */
export function SignInError(): null {
  const [error, setError] = useQueryState("error");
  const showMessage = useSnackbar();

  useEffect(() => {
    if (!error) return;
    showMessage(signInErrorMessage(error), "error");
    void setError(null);
  }, [error, setError, showMessage]);

  return null;
}
