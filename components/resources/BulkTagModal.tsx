"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/lib/client/workspace-context";
import { resolveTagIds } from "@/lib/client/tag-utils";

interface BulkTagModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (tagId: string) => Promise<void>;
}

export function BulkTagModal({ open, onClose, onApply }: BulkTagModalProps) {
  const { tags, setTags } = useWorkspace();
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);

  async function handleApply() {
    if (!input.trim()) return;
    setWorking(true);
    try {
      const [tagId] = await resolveTagIds(input.split(",")[0], tags, setTags);
      if (tagId) await onApply(tagId);
      setInput("");
      onClose();
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add tag to selection" widthClassName="max-w-sm">
      <div className="space-y-3">
        <input
          autoFocus
          list="existing-tags"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tag name"
          className="input"
        />
        <datalist id="existing-tags">
          {tags.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={working}>
            {working ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
