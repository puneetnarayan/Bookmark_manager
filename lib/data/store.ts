import "server-only";
import { getFile, putFile, getGitHubConfig, GitHubConflictError } from "@/lib/github/client";
import type { GitHubConfig } from "@/lib/github/client";
import type { DataFileName } from "@/lib/validation/schemas";
import { DATA_FILE_PATHS, DATA_FILE_SCHEMAS, defaultDataFor, type DataFileType } from "./files";

export class DataValidationError extends Error {
  issues: unknown;
  constructor(message: string, issues: unknown) {
    super(message);
    this.name = "DataValidationError";
    this.issues = issues;
  }
}

export interface ReadResult<K extends DataFileName> {
  data: DataFileType<K>;
  sha: string | null;
}

/** Reads and validates a data file. Returns the default (empty) shape + null sha if the file doesn't exist yet. */
export async function readDataFile<K extends DataFileName>(
  name: K,
  config: GitHubConfig = getGitHubConfig()
): Promise<ReadResult<K>> {
  const path = DATA_FILE_PATHS[name];
  const file = await getFile(config, path);

  if (!file) {
    return { data: defaultDataFor(name), sha: null };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(file.content);
  } catch (err) {
    throw new DataValidationError(`${path} contains invalid JSON`, err);
  }

  const schema = DATA_FILE_SCHEMAS[name];
  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw new DataValidationError(`${path} failed schema validation`, result.error.issues);
  }

  return { data: result.data as DataFileType<K>, sha: file.sha };
}

export interface WriteOptions {
  message: string;
  /** SHA the caller last read. Pass null only when certain the file does not exist yet. */
  expectedSha: string | null;
}

export interface WriteResult<K extends DataFileName> {
  data: DataFileType<K>;
  sha: string;
}

/**
 * Validates and writes a data file, using expectedSha for optimistic concurrency.
 * Throws GitHubConflictError if the remote file changed since expectedSha was read —
 * callers should re-read, re-apply their change, and retry rather than overwrite blindly.
 */
export async function writeDataFile<K extends DataFileName>(
  name: K,
  data: DataFileType<K>,
  options: WriteOptions,
  config: GitHubConfig = getGitHubConfig()
): Promise<WriteResult<K>> {
  const schema = DATA_FILE_SCHEMAS[name];
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new DataValidationError(`Refusing to write invalid ${name} data`, result.error.issues);
  }

  const path = DATA_FILE_PATHS[name];
  const content = JSON.stringify(result.data, null, 2) + "\n";

  const put = await putFile(config, {
    path,
    content,
    message: options.message,
    sha: options.expectedSha,
  });

  return { data: result.data as DataFileType<K>, sha: put.sha };
}

/**
 * Read-modify-write helper with a single automatic retry on conflict: re-reads the
 * file, re-applies `mutate` to the fresh data, and writes again. If it conflicts a
 * second time, the conflict is surfaced to the caller instead of retrying forever.
 */
export async function updateDataFile<K extends DataFileName>(
  name: K,
  mutate: (current: DataFileType<K>) => DataFileType<K>,
  message: string,
  config: GitHubConfig = getGitHubConfig()
): Promise<WriteResult<K>> {
  const first = await readDataFile(name, config);
  try {
    return await writeDataFile(name, mutate(first.data), { message, expectedSha: first.sha }, config);
  } catch (err) {
    if (err instanceof GitHubConflictError) {
      const second = await readDataFile(name, config);
      return await writeDataFile(
        name,
        mutate(second.data),
        { message, expectedSha: second.sha },
        config
      );
    }
    throw err;
  }
}
