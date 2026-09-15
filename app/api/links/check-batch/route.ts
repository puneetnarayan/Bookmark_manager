import { NextRequest, NextResponse } from "next/server";
import { checkLink, type LinkStatus } from "@/lib/urls/link-check";
import { updateDataFile, readDataFile } from "@/lib/data/store";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

const MAX_BATCH = 25;
const CONCURRENCY = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
    if (ids.length === 0) return badRequest("ids must be a non-empty array");
    if (ids.length > MAX_BATCH) {
      return badRequest(`A maximum of ${MAX_BATCH} links can be checked at once`);
    }

    const { data: resources } = await readDataFile("resources");
    const { data: settings } = await readDataFile("settings");
    const targets = resources.filter((r) => ids.includes(r.id));

    const results = new Map<string, { httpStatus: number | null; linkStatus: LinkStatus; lastCheckedAt: string }>();
    let index = 0;
    async function worker() {
      while (index < targets.length) {
        const current = targets[index++];
        const checkResult = await checkLink(current.url, settings.linkCheckTimeoutMs);
        results.set(current.id, {
          httpStatus: checkResult.httpStatus,
          linkStatus: checkResult.linkStatus,
          lastCheckedAt: new Date().toISOString(),
        });
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

    await updateDataFile(
      "resources",
      (current) =>
        current.map((r) => {
          const result = results.get(r.id);
          if (!result) return r;
          return { ...r, ...result, updatedAt: new Date().toISOString() };
        }),
      `Batch link check for ${results.size} resource(s)`
    );

    return NextResponse.json({ checked: Array.from(results.entries()).map(([id, r]) => ({ id, ...r })) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
