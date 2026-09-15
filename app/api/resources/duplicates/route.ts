import { NextResponse } from "next/server";
import { listEntities } from "@/lib/data/entity-crud";
import { findDuplicateGroups } from "@/lib/urls/duplicates";
import { toErrorResponse } from "@/lib/api-utils";
import type { Resource } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const resources = (await listEntities("resources")) as unknown as Resource[];
    const groups = findDuplicateGroups(resources);
    return NextResponse.json({ groups });
  } catch (err) {
    return toErrorResponse(err);
  }
}
