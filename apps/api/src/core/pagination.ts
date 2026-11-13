/** A page of results plus what the client needs to page through them. */
export interface Page<T> {
  results: T[];
  page: number;
  limit: number;
  count: number;
  totalPages: number;
}

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
