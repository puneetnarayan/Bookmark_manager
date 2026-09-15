import { NextRequest, NextResponse } from "next/server";
import { restoreBackup } from "@/lib/backup/backup";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : "";
    if (!path.startsWith("backups/") || !path.endsWith(".json")) {
      return badRequest("path must reference a file under backups/");
    }
    const result = await restoreBackup(path);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
