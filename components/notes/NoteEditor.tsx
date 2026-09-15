"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon, Code, Eye, Pencil } from "lucide-react";
import { renderNoteMarkdown } from "@/lib/notes/markdown";

interface NoteEditorProps {
  value: string;
  onSave: (content: string) => void | Promise<void>;
  placeholder?: string;
}

const TOOLBAR_ACTIONS: Array<{ label: string; icon: typeof Bold; before: string; after: string }> = [
  { label: "Bold", icon: Bold, before: "**", after: "**" },
  { label: "Italic", icon: Italic, before: "*", after: "*" },
  { label: "Heading", icon: Heading2, before: "## ", after: "" },
  { label: "Bulleted list", icon: List, before: "- ", after: "" },
  { label: "Numbered list", icon: ListOrdered, before: "1. ", after: "" },
  { label: "Link", icon: LinkIcon, before: "[", after: "](https://)" },
  { label: "Code", icon: Code, before: "`", after: "`" },
];

export function NoteEditor({ value, onSave, placeholder }: NoteEditorProps) {
  const [content, setContent] = useState(value);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setContent(value);
    setDirty(false);
  }, [value]);

  function scheduleSave(next: string) {
    setContent(next);
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(next);
      setDirty(false);
    }, 800);
  }

  function applyFormat(before: string, after: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = content.slice(0, start) + before + content.slice(start, end) + after + content.slice(end);
    scheduleSave(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    });
  }

  return (
    <div className="rounded-lg border border-[var(--border)]">
      <div className="flex items-center gap-1 border-b border-[var(--border)] px-2 py-1">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.label}
            aria-label={action.label}
            onClick={() => applyFormat(action.before, action.after)}
            className="rounded p-1.5 hover:bg-[var(--surface-hover)]"
            disabled={preview}
          >
            <action.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {dirty && <span className="text-xs text-[var(--muted)]">Saving…</span>}
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1 rounded p-1.5 text-xs hover:bg-[var(--surface-hover)]"
          >
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>
      {preview ? (
        <div
          className="prose prose-sm max-w-none px-3 py-3 text-sm dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(content || "*Nothing here yet*") }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => scheduleSave(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className="w-full resize-none border-0 bg-transparent px-3 py-3 text-sm outline-none"
        />
      )}
    </div>
  );
}
