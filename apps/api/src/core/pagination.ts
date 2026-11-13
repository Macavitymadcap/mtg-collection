import type { Page } from "@mtg/shared";

export type { Page };

/** Which page the caller asked for. */
export interface PageRequest {
  page: number;
  limit: number;
}

/** Builds a Page from one page of rows and the total count. */
export function toPage<T>(results: T[], count: number, request: PageRequest): Page<T> {
  return {
    results,
    page: request.page,
    limit: request.limit,
    count,
    totalPages: Math.ceil(count / request.limit),
  };
}
