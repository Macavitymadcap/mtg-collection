import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

export function GET(request: Request): Promise<NextResponse> {
  return forward(request, { path: "/catalog/autocomplete" });
}
