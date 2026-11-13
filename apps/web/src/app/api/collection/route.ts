import { createCollectionEntrySchema } from "@mtg/shared";
import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

export function GET(request: Request): Promise<NextResponse> {
  return forward(request, { path: "/collection" });
}

export function POST(request: Request): Promise<NextResponse> {
  return forward(request, { path: "/collection", bodySchema: createCollectionEntrySchema });
}
