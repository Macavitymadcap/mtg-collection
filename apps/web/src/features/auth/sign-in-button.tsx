"use client";

import type { JSX } from "react";
import GitHub from "@mui/icons-material/GitHub";
import Button, { type ButtonProps } from "@mui/material/Button";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { errorMessage } from "@/lib/errors";
import { useSignIn } from "./queries";

/** Signs in with GitHub and comes back to this page. */
export function SignInButton({ children = "Sign in", ...props }: Omit<ButtonProps, "onClick">): JSX.Element {
  const signIn = useSignIn();
  const showMessage = useSnackbar();
  return (
    <Button
      startIcon={<GitHub />}
      {...props}
      loading={signIn.isPending}
      onClick={() =>
        signIn.mutate(undefined, { onError: (error) => showMessage(errorMessage(error, "Couldn't sign in"), "error") })
      }
    >
      {children}
    </Button>
  );
}
