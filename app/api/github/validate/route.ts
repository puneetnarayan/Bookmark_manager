import { NextResponse } from "next/server";
import { readDataFile } from "@/lib/data/store";
import { toErrorResponse } from "@/lib/api-utils";
import type { DataFileName } from "@/lib/validation/schemas";

const ALL_DATA_FILES: DataFileName[] = [
  "workspace",
  "spaces",
  "collections",
  "resources",
  "tags",
  "tasks",
  "notes",
  "quick-links",
  "settings",
  "metadata",
];

/** Re-validates every data file against its schema without changing anything. */
export async function GET() {
  try {
    const results = await Promise.all(
      ALL_DATA_FILES.map(async (name) => {
        await readDataFile(name);
        return name;
      })
    );
    return NextResponse.json({ valid: true, checkedFiles: results });
  } catch (err) {
    return toErrorResponse(err);
  }
}
