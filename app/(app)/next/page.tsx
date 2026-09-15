"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListChecks, Plus, Archive } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { NextItemRow } from "@/components/next/NextItemRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { isOverdue } from "@/lib/client/derived";
import clsx from "clsx";

type ViewKey = "today" | "upcoming" | "overdue" | "no-date" | "completed";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "no-date", label: "No Date" },
  { key: "completed", label: "Completed" },
];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function NextPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <NextPageInner />
    </Suspense>
  );
}

function NextPageInner() {
  const { loading, tasks, setTasks } = useWorkspace();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewKey>((searchParams.get("view") as ViewKey) || "today");
  const [newTitle, setNewTitle] = useState("");
  const dragIndex = useRef<number | null>(null);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  const filtered = useMemo(() => {
    switch (view) {
      case "today":
        return activeTasks.filter((t) => !t.completed && t.dueDate && isToday(t.dueDate));
      case "upcoming":
        return activeTasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) > new Date() && !isToday(t.dueDate));
      case "overdue":
        return activeTasks.filter(isOverdue);
      case "no-date":
        return activeTasks.filter((t) => !t.completed && !t.dueDate);
      case "completed":
        return activeTasks.filter((t) => t.completed);
      default:
        return activeTasks;
    }
  }, [activeTasks, view]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.order - b.order), [filtered]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { task } = await api.tasks.create({ title: newTitle.trim(), order: tasks.length });
      setTasks((prev) => [...prev, task]);
      setNewTitle("");
    } catch {
      addToast("error", "Could not add to Next");
    }
  }

  async function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((t, i) => ({ ...t, order: i }));
    setTasks((prev) => prev.map((t) => withOrder.find((w) => w.id === t.id) ?? t));
    await Promise.all(withOrder.map((t) => api.tasks.update(t.id, { order: t.order }))).catch(() => undefined);
  }

  async function archiveCompleted() {
    const completedIds = activeTasks.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;
    try {
      await Promise.all(completedIds.map((id) => api.tasks.update(id, { archived: true })));
      setTasks((prev) => prev.map((t) => (completedIds.includes(t.id) ? { ...t, archived: true } : t)));
      addToast("success", `Archived ${completedIds.length} completed item(s)`);
    } catch {
      addToast("error", "Could not archive completed items");
    }
  }

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Next</h1>
          <p className="text-sm text-[var(--muted)]">Your action queue.</p>
        </div>
        {view === "completed" && (
          <Button variant="secondary" onClick={archiveCompleted}>
            <Archive className="h-4 w-4" /> Archive Completed
          </Button>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex max-w-md gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a Next item…"
          className="input"
        />
        <Button type="submit" variant="primary">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              view === v.key ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing here" description="Items you add to Next will show up in the matching view." />
      ) : (
        <div className="space-y-2">
          {sorted.map((task, i) => (
            <NextItemRow
              key={task.id}
              task={task}
              draggable={view !== "completed"}
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={() => undefined}
              onDrop={() => handleDrop(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
