"use client";

import { useState } from "react";
import clsx from "clsx";
import { Trash2, ChevronDown, ChevronUp, GripVertical, ExternalLink } from "lucide-react";
import type { NextItem, Priority } from "@/types";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { isOverdue } from "@/lib/client/derived";

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
};

interface NextItemRowProps {
  task: NextItem;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

export function NextItemRow({ task, draggable, onDragStart, onDragOver, onDrop }: NextItemRowProps) {
  const { resources, setTasks } = useWorkspace();
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [noteValue, setNoteValue] = useState(task.note);

  const resource = resources.find((r) => r.id === task.resourceId);

  function patchLocal(patch: Partial<NextItem>) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
  }

  async function toggleComplete() {
    const next = !task.completed;
    patchLocal({ completed: next, completedAt: next ? new Date().toISOString() : null });
    try {
      await api.tasks.update(task.id, { completed: next });
    } catch {
      patchLocal({ completed: !next });
      addToast("error", "Could not update task");
    }
  }

  async function updatePriority(priority: Priority) {
    patchLocal({ priority });
    try {
      await api.tasks.update(task.id, { priority });
    } catch {
      addToast("error", "Could not update priority");
    }
  }

  async function updateDueDate(dueDate: string) {
    const iso = dueDate ? new Date(dueDate).toISOString() : null;
    patchLocal({ dueDate: iso });
    try {
      await api.tasks.update(task.id, { dueDate: iso });
    } catch {
      addToast("error", "Could not update due date");
    }
  }

  async function saveNote() {
    try {
      await api.tasks.update(task.id, { note: noteValue });
      patchLocal({ note: noteValue });
    } catch {
      addToast("error", "Could not save note");
    }
  }

  async function remove() {
    try {
      await api.tasks.remove(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch {
      addToast("error", "Could not remove item");
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {draggable && (
          <button
            draggable
            onDragStart={onDragStart}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver?.();
            }}
            onDrop={onDrop}
            aria-label="Drag to reorder"
            className="cursor-grab text-[var(--muted)]"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <input type="checkbox" checked={task.completed} onChange={toggleComplete} aria-label={`Mark "${task.title}" complete`} />
        <div className="min-w-0 flex-1">
          <p className={clsx("truncate text-sm font-medium", task.completed && "text-[var(--muted)] line-through")}>
            {task.title}
          </p>
          {resource && (
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--muted)] hover:underline">
              <ExternalLink className="h-3 w-3" /> {resource.domain ?? resource.url}
            </a>
          )}
        </div>
        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
        {task.dueDate && (
          <span className={clsx("text-xs", isOverdue(task) ? "text-red-500" : "text-[var(--muted)]")}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        <button onClick={() => setExpanded((v) => !v)} aria-label="Toggle details" className="rounded p-1 hover:bg-[var(--surface-hover)]">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={remove} aria-label="Remove from Next" className="rounded p-1 text-red-500 hover:bg-[var(--surface-hover)]">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-[var(--border)] px-3 py-2.5">
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              Priority
              <select value={task.priority} onChange={(e) => updatePriority(e.target.value as Priority)} className="input w-auto py-1">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              Due date
              <input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => updateDueDate(e.target.value)}
                className="input w-auto py-1"
              />
            </label>
          </div>
          <textarea
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onBlur={saveNote}
            rows={2}
            placeholder="Task note…"
            className="input resize-none text-sm"
          />
        </div>
      )}
    </div>
  );
}
