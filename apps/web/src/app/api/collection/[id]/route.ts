import { updateCollectionEntrySchema } from "@mtg/shared";
import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

type Context = RouteContext<"/api/collection/[id]">;

async function path(ctx: Context): Promise<string> {
  const { id } = await ctx.params;
  return `/collection/${encodeURIComponent(id)}`;
}

export async function GET(request: Request, ctx: Context): Promise<NextResponse> {
  return forward(request, { path: await path(ctx) });
}

export async function PATCH(request: Request, ctx: Context): Promise<NextResponse> {
  return forward(request, { path: await path(ctx), bodySchema: updateCollectionEntrySchema });
}

export async function DELETE(request: Request, ctx: Context): Promise<NextResponse> {
  return forward(request, { path: await path(ctx) });
}
