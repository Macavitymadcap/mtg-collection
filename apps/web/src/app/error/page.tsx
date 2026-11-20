import type { JSX } from "react";
import { ErrorPanel } from "@/components/feedback/error-panel";
import { SignInButton } from "@/features/auth/sign-in-button";
import { describeError } from "@/lib/error-codes";

const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * Where the browser is sent when something fails outside a page: a sign-in
 * that GitHub or the API refused (?error=<code>), or an API error on a link
 * opened directly (?status=<HTTP status>).
 */
export default async function ErrorRoute({ searchParams }: PageProps<"/error">): Promise<JSX.Element> {
  const params = await searchParams;
  const status = Number(one(params.status)) || undefined;
  const { title, message, signInAgain } = describeError(one(params.error), status);

  return (
    <ErrorPanel
      title={title}
      message={message}
      actions={signInAgain && <SignInButton variant="contained">Sign in again</SignInButton>}
      links={[{ href: "/", label: "Home" }]}
    />
  );
}
