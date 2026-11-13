import { updateDeckSchema } from "@mtg/shared";
import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

type Context = RouteContext<"/api/decks/[id]">;

async function path(ctx: Context): Promise<string> {
  const { id } = await ctx.params;
  return `/decks/${encodeURIComponent(id)}`;
}

export async function GET(request: Request, ctx: Context): Promise<NextResponse> {
  return forward(request, { path: await path(ctx) });
}

export async function PATCH(request: Request, ctx: Context): Promise<NextResponse> {
  return forward(request, { path: await path(ctx), bodySchema: updateDeckSchema });
}

export async function DELETE(request: Request, ctx: Context): Promise<NextResponse> {
  return forward(request, { path: await path(ctx) });
}
