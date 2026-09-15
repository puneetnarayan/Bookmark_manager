import { NextResponse } from "next/server";
import { updateDataFile } from "@/lib/data/store";
import { createBackup } from "@/lib/backup/backup";
import { toErrorResponse } from "@/lib/api-utils";

export async function POST() {
  try {
    await createBackup("before emptying trash");

    let resourcesRemoved = 0;
    await updateDataFile(
      "resources",
      (current) => {
        const next = current.filter((r) => !r.deletedAt);
        resourcesRemoved = current.length - next.length;
        return next;
      },
      "Empty trash: resources"
    );

    let collectionsRemoved = 0;
    await updateDataFile(
      "collections",
      (current) => {
        const next = current.filter((c) => !c.deletedAt);
        collectionsRemoved = current.length - next.length;
        return next;
      },
      "Empty trash: collections"
    );

    let spacesRemoved = 0;
    await updateDataFile(
      "spaces",
      (current) => {
        const next = current.filter((s) => !s.deletedAt);
        spacesRemoved = current.length - next.length;
        return next;
      },
      "Empty trash: spaces"
    );

    return NextResponse.json({ resourcesRemoved, collectionsRemoved, spacesRemoved });
  } catch (err) {
    return toErrorResponse(err);
  }
}
