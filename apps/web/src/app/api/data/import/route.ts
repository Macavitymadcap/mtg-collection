import type { NextResponse } from "next/server";
import { forward } from "@/lib/backend";

// No body schema here: the API validates export files itself and reports each
// problem by its path in the file, which is more useful than a second check.
export function POST(request: Request): Promise<NextResponse> {
  return forward(request, { path: "/data/import" });
}
