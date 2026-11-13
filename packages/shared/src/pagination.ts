/** A page of results plus what the client needs to page through them. */
export interface Page<T> {
  results: T[];
  page: number;
  limit: number;
  count: number;
  totalPages: number;
}
