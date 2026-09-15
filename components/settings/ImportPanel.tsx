"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { useWorkspace } from "@/lib/client/workspace-context";

type Preview =
  | { type: "bookmark-html"; html: string; totalBookmarks: number; totalDuplicates: number; groups: { space: string; collection: string; count: number; duplicates: number }[] }
  | { type: "json"; payload: unknown; counts: Record<string, number>; totalDuplicates: number };

export function ImportPanel() {
  const { refresh } = useWorkspace();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      if (file.name.endsWith(".json")) {
        const payload = JSON.parse(text);
        const result = await api.importExport.previewJson(payload);
        setPreview({ type: "json", payload, counts: result.counts, totalDuplicates: result.totalDuplicates });
      } else {
        const result = await api.importExport.previewBookmarkHtml(text);
        setPreview({ type: "bookmark-html", html: text, ...result });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof SyntaxError ? "That file is not valid JSON" : "Could not read that file");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setCommitting(true);
    try {
      const result =
        preview.type === "json"
          ? await api.importExport.commitJson(preview.payload)
          : await api.importExport.commitBookmarkHtml(preview.html);
      addToast(
        "success",
        `Imported ${result.spacesAdded} space(s), ${result.collectionsAdded} collection(s), ${result.resourcesAdded} resource(s)`
      );
      setPreview(null);
      await refresh();
    } catch (err) {
      addToast("error", err instanceof ApiError ? err.message : "Import failed. Nothing was changed.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.html,.htm"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
        {loading ? "Reading file…" : "Choose File to Import"}
      </Button>
      <p className="text-xs text-[var(--muted)]">Accepts this app&apos;s JSON export or a browser bookmarks HTML export.</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ConfirmDialog
        open={preview !== null}
        title="Confirm import"
        description={
          preview?.type === "json"
            ? `This will add ${preview.counts.spaces} space(s), ${preview.counts.collections} collection(s), ${preview.counts.resources} resource(s), ${preview.counts.tags} tag(s). ${preview.totalDuplicates} possible duplicate URL(s) detected. A backup will be created first.`
            : preview?.type === "bookmark-html"
              ? `This will add ${preview.totalBookmarks} bookmark(s) across ${preview.groups.length} folder(s). ${preview.totalDuplicates} possible duplicate URL(s) detected. A backup will be created first.`
              : ""
        }
        confirmLabel="Import"
        loading={committing}
        onConfirm={handleConfirm}
        onCancel={() => setPreview(null)}
      />
    </div>
  );
}
