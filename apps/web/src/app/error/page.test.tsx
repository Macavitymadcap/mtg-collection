import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/render";
import ErrorRoute from "./page";

/** Renders the page as Next would, with these query parameters. */
async function open(searchParams: Record<string, string | string[]>) {
  renderWithProviders(await ErrorRoute({ params: Promise.resolve({}), searchParams: Promise.resolve(searchParams) }));
}

describe("/error", () => {
  it("explains a refused sign-in, without offering to sign in again", async () => {
    await open({ error: "unable_to_create_user" });

    expect(screen.getByRole("heading", { name: "Not allowed to sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Sign in again" })).not.toBeInTheDocument();
  });

  it("offers to sign in again when the GitHub link expired", async () => {
    await open({ error: "state_mismatch" });

    expect(screen.getByRole("heading", { name: "Sign-in expired" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeInTheDocument();
  });

  it("explains an API error from its status", async () => {
    await open({ status: "502" });
    expect(screen.getByRole("heading", { name: "Something's down" })).toBeInTheDocument();
  });

  it("uses the first of repeated parameters, and a general message for nonsense", async () => {
    await open({ error: ["nonsense", "unable_to_create_user"], status: "abc" });
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  });
});
