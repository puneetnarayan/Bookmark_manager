import { useMemo } from "react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import type { Note } from "@/types";

export function useNote(targetType: Note["targetType"], targetId: string) {
  const { notes, setNotes } = useWorkspace();
  const note = useMemo(
    () => notes.find((n) => n.targetType === targetType && n.targetId === targetId),
    [notes, targetType, targetId]
  );

  async function save(content: string) {
    const { note: saved } = await api.notes.save(targetType, targetId, content);
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === saved.id);
      return exists ? prev.map((n) => (n.id === saved.id ? saved : n)) : [...prev, saved];
    });
  }

  return { content: note?.content ?? "", save };
}
