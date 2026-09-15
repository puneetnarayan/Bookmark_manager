"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Pin, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { useNote } from "@/hooks/useNote";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { resolveTagIds } from "@/lib/client/tag-utils";
import { Library } from "lucide-react";

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loading, resources, collections, spaces, tags, setResources, setTags } = useWorkspace();
  const { addToast } = useToast();
  const note = useNote("resource", id);

  const resource = resources.find((r) => r.id === id);
  const collection = collections.find((c) => c.id === resource?.collectionId);
  const space = spaces.find((s) => s.id === resource?.spaceId);
  const resourceTags = useMemo(() => tags.filter((t) => resource?.tags.includes(t.id)), [tags, resource]);

  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [url, setUrl] = useState(resource?.url ?? "");
  const [tagsInput, setTagsInput] = useState(resourceTags.map((t) => t.name).join(", "));
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resource) return;
    setTitle(resource.title);
    setDescription(resource.description);
    setUrl(resource.url);
    setTagsInput(resourceTags.map((t) => t.name).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!resource) return;
    setSaving(true);
    setError(null);
    try {
      const tagIds = await resolveTagIds(tagsInput, tags, setTags);
      const { resource: updated } = await api.resources.update(resource.id, { title, description, url, tags: tagIds });
      setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      addToast("success", "Resource updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckLink() {
    if (!resource) return;
    setChecking(true);
    try {
      const { resource: updated } = await api.links.check(resource.id);
      setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      addToast("info", `Link status: ${updated.linkStatus}`);
    } catch {
      addToast("error", "Could not check this link");
    } finally {
      setChecking(false);
    }
  }

  async function handleTrash() {
    if (!resource) return;
    try {
      await api.resources.trash(resource.id);
      addToast("success", "Moved to Trash");
      router.push(collection ? `/collections/${collection.id}` : "/resources");
    } catch {
      addToast("error", "Could not move to Trash");
    }
  }

  async function toggle(field: "favorite" | "pinned") {
    if (!resource) return;
    const next = !resource[field];
    setResources((prev) => prev.map((r) => (r.id === resource.id ? { ...r, [field]: next } : r)));
    try {
      await api.resources.update(resource.id, { [field]: next });
    } catch {
      setResources((prev) => prev.map((r) => (r.id === resource.id ? { ...r, [field]: !next } : r)));
      addToast("error", "Could not save that change");
    }
  }

  if (loading) return <Skeleton className="h-64" />;

  if (!resource) {
    return (
      <EmptyState
        icon={Library}
        title="Resource not found"
        description="It may have been deleted or moved to Trash."
        action={
          <Button variant="secondary" onClick={() => router.push("/resources")}>
            Back to All Resources
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={collection ? `/collections/${collection.id}` : "/resources"}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {collection?.name ?? "All Resources"}
        </Link>
      </div>

      <div className="flex items-start gap-3">
        {resource.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resource.favicon} alt="" className="mt-1 h-8 w-8 rounded" />
        ) : (
          <div className="mt-1 h-8 w-8 rounded bg-[var(--surface-hover)]" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{resource.title || resource.url}</h1>
          <p className="text-xs text-[var(--muted)]">
            {space?.name} {collection ? `· ${collection.name}` : ""} · {resource.domain}
          </p>
        </div>
        <button onClick={() => toggle("favorite")} aria-pressed={resource.favorite} aria-label="Toggle favorite" className="rounded p-1.5 hover:bg-[var(--surface-hover)]">
          <Star className={resource.favorite ? "h-5 w-5 fill-amber-400 text-amber-400" : "h-5 w-5 text-[var(--muted)]"} />
        </button>
        <button onClick={() => toggle("pinned")} aria-pressed={resource.pinned} aria-label="Toggle pin" className="rounded p-1.5 hover:bg-[var(--surface-hover)]">
          <Pin className={resource.pinned ? "h-5 w-5 fill-[var(--accent)] text-[var(--accent)]" : "h-5 w-5 text-[var(--muted)]"} />
        </button>
        <a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label="Open" className="rounded p-1.5 hover:bg-[var(--surface-hover)]">
          <ExternalLink className="h-5 w-5 text-[var(--muted)]" />
        </a>
      </div>

      <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">URL</span>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tags (comma-separated)</span>
          <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="input" />
        </label>

        <div className="flex items-center justify-between rounded-md bg-[var(--surface-hover)] px-3 py-2 text-sm">
          <div>
            <p className="font-medium">Link status: {resource.linkStatus}</p>
            <p className="text-xs text-[var(--muted)]">
              {resource.lastCheckedAt ? `Last checked ${new Date(resource.lastCheckedAt).toLocaleString()}` : "Never checked"}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleCheckLink} disabled={checking}>
            <RefreshCw className={checking ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Check Link
          </Button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="danger" onClick={handleTrash}>
            <Trash2 className="h-4 w-4" /> Move to Trash
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Notes</h2>
        <NoteEditor value={note.content} onSave={note.save} placeholder="Notes about this resource…" />
      </div>
    </div>
  );
}
