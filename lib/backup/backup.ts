import "server-only";
import { getFile, putFile, listDir, getGitHubConfig } from "@/lib/github/client";
import type { GitHubConfig } from "@/lib/github/client";
import { readDataFile, writeDataFile } from "@/lib/data/store";
import { DATA_FILE_PATHS } from "@/lib/data/files";
import type { DataFileName } from "@/lib/validation/schemas";
import { updateDataFile } from "@/lib/data/store";

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

export interface BackupSnapshot {
  createdAt: string;
  reason: string;
  data: Partial<Record<DataFileName, unknown>>;
}

export interface BackupSummary {
  path: string;
  fileName: string;
  createdAt: string;
  reason: string;
}

function backupPath(date: Date): { dir: string; path: string; fileName: string } {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const dir = `backups/${yyyy}/${yyyy}-${mm}-${dd}`;
  const fileName = `backup-${hh}-${min}-${ss}.json`;
  return { dir, path: `${dir}/${fileName}`, fileName };
}

/** Snapshots every data file into a single timestamped JSON file under /backups and commits it. */
export async function createBackup(
  reason: string,
  config: GitHubConfig = getGitHubConfig()
): Promise<BackupSummary> {
  const data: Partial<Record<DataFileName, unknown>> = {};
  for (const name of ALL_DATA_FILES) {
    const { data: fileData } = await readDataFile(name, config);
    data[name] = fileData;
  }

  const createdAt = new Date();
  const snapshot: BackupSnapshot = { createdAt: createdAt.toISOString(), reason, data };
  const { path, fileName } = backupPath(createdAt);

  await putFile(config, {
    path,
    content: JSON.stringify(snapshot, null, 2) + "\n",
    message: `Backup: ${reason}`,
  });

  await updateDataFile(
    "metadata",
    (current) => ({ ...current, lastBackupAt: createdAt.toISOString() }),
    `Update lastBackupAt after backup: ${reason}`,
    config
  );

  return { path, fileName, createdAt: snapshot.createdAt, reason };
}

/** Lists backups newest-first by walking backups/<year>/<date>/ directories. */
export async function listBackups(
  config: GitHubConfig = getGitHubConfig()
): Promise<BackupSummary[]> {
  const years = await listDir(config, "backups");
  const summaries: BackupSummary[] = [];

  for (const year of years.filter((e) => e.type === "dir")) {
    const days = await listDir(config, year.path);
    for (const day of days.filter((e) => e.type === "dir")) {
      const files = await listDir(config, day.path);
      for (const file of files.filter((e) => e.type === "file" && e.name.endsWith(".json"))) {
        const match = file.name.match(/^backup-(\d{2})-(\d{2})-(\d{2})\.json$/);
        const dateMatch = day.name;
        const timePart = match ? `${match[1]}:${match[2]}:${match[3]}` : "00:00:00";
        summaries.push({
          path: file.path,
          fileName: file.name,
          createdAt: `${dateMatch}T${timePart}Z`,
          reason: "",
        });
      }
    }
  }

  summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return summaries;
}

export async function getBackup(
  path: string,
  config: GitHubConfig = getGitHubConfig()
): Promise<BackupSnapshot | null> {
  const file = await getFile(config, path);
  if (!file) return null;
  return JSON.parse(file.content) as BackupSnapshot;
}

/**
 * Restores a backup by writing each of its data files back over the current ones.
 * A pre-restore backup is taken first so the restore itself is undoable.
 */
export async function restoreBackup(
  path: string,
  config: GitHubConfig = getGitHubConfig()
): Promise<{ restoredFiles: DataFileName[]; preRestoreBackup: BackupSummary }> {
  const snapshot = await getBackup(path, config);
  if (!snapshot) {
    throw new Error(`Backup not found: ${path}`);
  }

  const preRestoreBackup = await createBackup(`before restoring ${path}`, config);

  const restoredFiles: DataFileName[] = [];
  for (const name of ALL_DATA_FILES) {
    const value = snapshot.data[name];
    if (value === undefined) continue;
    const current = await readDataFile(name, config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await writeDataFile(name, value as any, {
      message: `Restore ${name} from backup ${path}`,
      expectedSha: current.sha,
    }, config);
    restoredFiles.push(name);
  }

  return { restoredFiles, preRestoreBackup };
}

export { ALL_DATA_FILES, DATA_FILE_PATHS };
