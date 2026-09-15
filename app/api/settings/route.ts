import { NextRequest, NextResponse } from "next/server";
import { settingsSchema } from "@/lib/validation/schemas";
import { readDataFile, updateDataFile } from "@/lib/data/store";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function GET() {
  try {
    const { data } = await readDataFile("settings");
    return NextResponse.json({ settings: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = settingsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid settings patch", parsed.error.issues);
    }
    const { data } = await updateDataFile(
      "settings",
      (current) => ({ ...current, ...parsed.data }),
      "Update settings"
    );
    return NextResponse.json({ settings: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
