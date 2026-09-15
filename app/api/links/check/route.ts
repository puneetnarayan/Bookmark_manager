import { NextRequest, NextResponse } from "next/server";
import { checkLink } from "@/lib/urls/link-check";
import { updateEntity, listEntities } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";
import { readDataFile } from "@/lib/data/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id as string | undefined;
    if (!id) return badRequest("id is required");

    const resources = await listEntities("resources");
    const resource = resources.find((r) => r.id === id);
    if (!resource) return notFound("Resource not found");

    const { data: settings } = await readDataFile("settings");
    const result = await checkLink(resource.url as string, settings.linkCheckTimeoutMs);

    const updated = await updateEntity(
      "resources",
      id,
      {
        httpStatus: result.httpStatus,
        linkStatus: result.linkStatus,
        lastCheckedAt: new Date().toISOString(),
      },
      `Check link for resource ${id}: ${result.linkStatus}`
    );

    return NextResponse.json({ resource: updated, result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
