import type { NextResponse } from "next/server";
import { z } from "zod";
import { forward } from "@/lib/backend";

const bodySchema = z.object({
  fileName: z.string().regex(/^[A-Za-z0-9_]+$/),
  createDeck: z.boolean(),
  useOwnedCards: z.boolean().optional(),
  deckName: z.string().max(100).optional(),
});

export function POST(request: Request): Promise<NextResponse> {
  return forward(request, { path: "/import/precon", bodySchema });
}
