import { collectionSorts, finishes, rarities } from "@mtg/shared";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
  type Values,
} from "nuqs";
import type { CollectionQuery } from "./queries";

export const collectionViews = ["table", "grid"] as const;

/** The collection page's state, kept in the URL so it survives refreshes and can be bookmarked. */
const parsers = {
  search: parseAsString,
  colors: parseAsString,
  type: parseAsString,
  setCode: parseAsString,
  rarity: parseAsStringLiteral(rarities),
  finish: parseAsStringLiteral(finishes),
  availableOnly: parseAsBoolean.withDefault(false),
  sort: parseAsStringLiteral(collectionSorts).withDefault("name"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(50),
  view: parseAsStringLiteral(collectionViews).withDefault("table"),
};

export type CollectionParams = Values<typeof parsers>;

/** A change to the URL state. null removes a value (or restores its default). */
export type CollectionParamsPatch = { [K in keyof CollectionParams]?: CollectionParams[K] | null };

export function useCollectionParams() {
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });

  /** Changes filters and goes back to page 1. null removes a filter. */
  const setFilters = (patch: CollectionParamsPatch) => void setParams({ ...patch, page: 1 });

  return { params, setParams, setFilters };
}

/** The API query for the current URL state. */
export function toCollectionQuery(params: CollectionParams): CollectionQuery {
  return {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    search: params.search ?? undefined,
    colors: params.colors ?? undefined,
    type: params.type ?? undefined,
    setCode: params.setCode ?? undefined,
    rarity: params.rarity ?? undefined,
    finish: params.finish ?? undefined,
    availableOnly: params.availableOnly || undefined,
  };
}
