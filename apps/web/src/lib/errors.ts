import { isResponseError } from "up-fetch";

/** A message to show the user for a failed request. Uses the API's message when there is one. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (isResponseError(error)) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
      return data.message;
    }
  }
  return fallback;
}
