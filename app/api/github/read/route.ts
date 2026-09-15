import { NextResponse } from "next/server";
import { getGitHubConfig } from "@/lib/github/client";
import { readDataFile } from "@/lib/data/store";
import { toErrorResponse } from "@/lib/api-utils";

/** Reads every data file in one call, for hydrating the client-side store on load. */
export async function GET() {
  try {
    const config = getGitHubConfig();
    const [workspace, spaces, collections, resources, tags, tasks, notes, quickLinks, settings] =
      await Promise.all([
        readDataFile("workspace", config),
        readDataFile("spaces", config),
        readDataFile("collections", config),
        readDataFile("resources", config),
        readDataFile("tags", config),
        readDataFile("tasks", config),
        readDataFile("notes", config),
        readDataFile("quick-links", config),
        readDataFile("settings", config),
      ]);

    return NextResponse.json({
      workspace: workspace.data,
      spaces: spaces.data,
      collections: collections.data,
      resources: resources.data,
      tags: tags.data,
      tasks: tasks.data,
      notes: notes.data,
      quickLinks: quickLinks.data,
      settings: settings.data,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
