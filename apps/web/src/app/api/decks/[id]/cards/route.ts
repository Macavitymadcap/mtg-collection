import { setDeckCardSchema } from "@mtg/shared";
import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

export async function PUT(request: Request, ctx: RouteContext<"/api/decks/[id]/cards">): Promise<NextResponse> {
  const { id } = await ctx.params;
  return forward(request, { path: `/decks/${encodeURIComponent(id)}/cards`, bodySchema: setDeckCardSchema });
}
