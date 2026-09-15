import { NextRequest, NextResponse } from "next/server";
import { createBackup, listBackups } from "@/lib/backup/backup";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function GET() {
  try {
    const backups = await listBackups();
    return NextResponse.json({ backups });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Manual backup";
    if (reason.length > 500) {
      return badRequest("reason must be 500 characters or fewer");
    }
    const summary = await createBackup(reason);
    return NextResponse.json({ backup: summary });
  } catch (err) {
    return toErrorResponse(err);
  }
}
