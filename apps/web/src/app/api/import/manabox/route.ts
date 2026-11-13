import type { NextResponse } from "next/server";
import { z } from "zod";
import { forward } from "@/lib/backend";

const bodySchema = z.object({ csv: z.string().min(1, "The file is empty") });

export function POST(request: Request): Promise<NextResponse> {
  return forward(request, { path: "/import/manabox", bodySchema });
}
