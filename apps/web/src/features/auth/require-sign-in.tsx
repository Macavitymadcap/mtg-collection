"use client";

import type { JSX, ReactNode } from "react";
import { EmptyState, LoadingState } from "@/components/feedback/page-states";
import { PageHeader } from "@/components/layout/page-header";
import { useSession } from "./queries";
import { SignInButton } from "./sign-in-button";

interface RequireSignInProps {
  /** The page's title, shown above the sign-in prompt. */
  title: string;
  /** What signing in lets you do here, e.g. "add cards". */
  purpose: string;
  children: ReactNode;
}

/** Shows a page's content only when signed in; visitors get a prompt to sign in instead. */
export function RequireSignIn({ title, purpose, children }: RequireSignInProps): JSX.Element {
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingState />;
  if (session) return <>{children}</>;

  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        title="Sign in to make changes"
        message={`Anyone can browse the collection and decks, but you need to sign in to ${purpose}.`}
        action={<SignInButton variant="contained">Sign in with GitHub</SignInButton>}
      />
    </>
  );
}
