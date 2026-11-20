import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/catalogue/cards/[setCode]/[collectorNumber]">,
): Promise<NextResponse> {
  const { setCode, collectorNumber } = await ctx.params;
  return forward(request, {
    path: `/catalogue/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(collectorNumber)}`,
  });
}
