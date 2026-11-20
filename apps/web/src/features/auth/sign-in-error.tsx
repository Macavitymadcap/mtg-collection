"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { describeError } from "@/lib/error-codes";

/**
 * After a failed sign-in, GitHub's round trip ends back on the page with
 * ?error=<code>. Shows why, then takes the code out of the address. The
 * error page explains the same code itself, so it's left alone there.
 */
export function SignInError(): null {
  const [error, setError] = useQueryState("error");
  const showMessage = useSnackbar();
  const onErrorPage = usePathname() === "/error";

  useEffect(() => {
    if (!error || onErrorPage) return;
    showMessage(describeError(error).message, "error");
    void setError(null);
  }, [error, onErrorPage, setError, showMessage]);

  return null;
}
