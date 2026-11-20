import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../test/msw";
import { navigation } from "../../../test/router";
import { renderWithProviders } from "../../../test/render";
import { sessionKey, useSession } from "./queries";
import { RequireSignIn } from "./require-sign-in";
import { SignInError } from "./sign-in-error";
import { UserMenu } from "./user-menu";

const assign = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockReset();
});

/** Stands in for window.location, which jsdom won't navigate. */
function stubLocation(pathname: string, search = "") {
  vi.stubGlobal("location", { ...window.location, pathname, search, origin: window.location.origin, assign });
}

describe("UserMenu", () => {
  it("signs in with GitHub and comes back to the current page", async () => {
    stubLocation("/decks/3", "?tab=stats");
    const bodies: unknown[] = [];
    server.use(
      http.post("*/api/auth/sign-in/social", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ url: "https://github.com/login/oauth/authorize?state=x", redirect: true });
      }),
    );
    const { user } = renderWithProviders(<UserMenu />, { session: null });

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("https://github.com/login/oauth/authorize?state=x"));
    expect(bodies).toEqual([
      { provider: "github", callbackURL: "/decks/3?tab=stats", errorCallbackURL: "/decks/3?tab=stats" },
    ]);
  });

  it("says when signing in fails", async () => {
    stubLocation("/");
    server.use(
      http.post("*/api/auth/sign-in/social", () =>
        HttpResponse.json({ message: "Provider not found" }, { status: 404 }),
      ),
    );
    const { user } = renderWithProviders(<UserMenu />, { session: null });

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Provider not found")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("shows who is signed in, and signs out, refetching what was loaded", async () => {
    const signOuts: string[] = [];
    server.use(
      http.post("*/api/auth/sign-out", ({ request }) => {
        signOuts.push(request.method);
        return HttpResponse.json({ success: true });
      }),
    );
    const { user, queryClient } = renderWithProviders(<UserMenu />);
    queryClient.setQueryData(["collection", "private"], "prices");

    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("Tester")).toBeInTheDocument();
    expect(screen.getByText("@tester")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByText("Signed out")).toBeInTheDocument();
    expect(signOuts).toEqual(["POST"]);
    expect(queryClient.getQueryState(["collection", "private"])).toMatchObject({ isInvalidated: true });
    expect(queryClient.getQueryData(sessionKey)).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("useSession", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );

  it("asks the site who is signed in", async () => {
    server.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({ session: { id: "s" }, user: { name: "Dan", image: null, githubLogin: "dan" } }),
      ),
    );
    const { result } = renderHook(() => useSession(), { wrapper });

    await vi.waitFor(() =>
      expect(result.current.data).toEqual({ user: { name: "Dan", image: null, githubLogin: "dan" } }),
    );
  });

  it("is null for visitors", async () => {
    server.use(http.get("*/api/auth/get-session", () => HttpResponse.json(null)));
    const { result } = renderHook(() => useSession(), { wrapper });

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("SignInError", () => {
  it("says why GitHub sign-in was refused, and tidies the address", async () => {
    const updates: string[] = [];
    renderWithProviders(<SignInError />, {
      searchParams: "?tab=stats&error=unable_to_create_user",
      onUrlUpdate: (event) => updates.push(event.queryString),
    });

    expect(await screen.findByText(/That GitHub account isn't allowed to sign in here/)).toBeInTheDocument();
    await vi.waitFor(() => expect(updates).toEqual(["?tab=stats"]));
  });

  it("explains other failures too", async () => {
    renderWithProviders(<SignInError />, { searchParams: "?error=access_denied" });
    expect(
      await screen.findByText("Signing in was cancelled on GitHub, so you're still browsing as a visitor."),
    ).toBeInTheDocument();
  });

  it("leaves the error page to explain the error itself", () => {
    navigation.pathname = "/error";
    const updates: string[] = [];
    renderWithProviders(<SignInError />, {
      searchParams: "?error=state_mismatch",
      onUrlUpdate: (event) => updates.push(event.queryString),
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(updates).toEqual([]);
  });

  it("says nothing when there's no error", () => {
    renderWithProviders(<SignInError />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("RequireSignIn", () => {
  it("shows the page to someone signed in", () => {
    renderWithProviders(
      <RequireSignIn title="Add cards" purpose="add cards">
        <p>The form</p>
      </RequireSignIn>,
    );
    expect(screen.getByText("The form")).toBeInTheDocument();
  });

  it("asks visitors to sign in instead", () => {
    renderWithProviders(
      <RequireSignIn title="Add cards" purpose="add cards">
        <p>The form</p>
      </RequireSignIn>,
      { session: null },
    );
    expect(screen.queryByText("The form")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add cards" })).toBeInTheDocument();
    expect(screen.getByText(/you need to sign in to add cards/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
  });
});
