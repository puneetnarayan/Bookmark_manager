"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Download, RefreshCw, History, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImportPanel } from "./ImportPanel";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { useWorkspace } from "@/lib/client/workspace-context";

interface Status {
  connected: boolean;
  owner: string;
  repo: string;
  branch: string;
  repoFullName: string;
  lastBackupAt: string | null;
  lastSyncAt: string | null;
}

interface BackupSummary {
  path: string;
  fileName: string;
  createdAt: string;
  reason: string;
}

export function DataBackupSettings() {
  const { refresh } = useWorkspace();
  const { addToast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [backups, setBackups] = useState<BackupSummary[] | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupSummary | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [validating, setValidating] = useState(false);

  async function loadStatus() {
    setTesting(true);
    setStatusError(null);
    try {
      const s = await api.status();
      setStatus(s);
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Could not reach the data store");
    } finally {
      setTesting(false);
    }
  }

  async function loadBackups() {
    try {
      const { backups: list } = await api.backups.list();
      setBackups(list);
    } catch {
      addToast("error", "Could not load backup history");
    }
  }

  useEffect(() => {
    loadStatus();
    loadBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBackupNow() {
    setCreatingBackup(true);
    try {
      await api.backups.create("Manual backup from Settings");
      addToast("success", "Backup created");
      await loadBackups();
      await loadStatus();
    } catch {
      addToast("error", "Could not create backup");
    } finally {
      setCreatingBackup(false);
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await api.backups.restore(restoreTarget.path);
      addToast("success", "Backup restored");
      setRestoreTarget(null);
      await refresh();
      await loadBackups();
    } catch {
      addToast("error", "Restore failed. Your data was not changed.");
    } finally {
      setRestoring(false);
    }
  }

  async function handleValidate() {
    setValidating(true);
    try {
      await api.validate();
      addToast("success", "All data files passed schema validation");
    } catch (err) {
      addToast("error", err instanceof ApiError ? `Validation failed: ${err.message}` : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  function downloadJson() {
    window.location.href = api.importExport.exportUrl("json", "all");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Repository Status</h3>
        {status ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <StatusRow label="GitHub" value={status.connected ? "Connected" : "Disconnected"} ok={status.connected} />
            <StatusRow label="Repository" value={status.repoFullName} />
            <StatusRow label="Branch" value={status.branch} />
            <StatusRow label="Last Backup" value={status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString() : "Never"} />
          </dl>
        ) : statusError ? (
          <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" /> {statusError}
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">Checking…</p>
        )}
        <Button variant="secondary" size="sm" className="mt-3" onClick={loadStatus} disabled={testing}>
          <RefreshCw className={testing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Test Connection
        </Button>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Backup</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleBackupNow} disabled={creatingBackup}>
            {creatingBackup ? "Backing up…" : "Backup Now"}
          </Button>
          <Button variant="secondary" onClick={handleValidate} disabled={validating}>
            <ShieldCheck className="h-4 w-4" /> {validating ? "Validating…" : "Validate Data"}
          </Button>
          <Button variant="secondary" onClick={downloadJson}>
            <Download className="h-4 w-4" /> Download JSON
          </Button>
        </div>

        <h4 className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          <History className="h-3.5 w-3.5" /> Backup History
        </h4>
        {!backups ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No backups yet.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {backups.slice(0, 30).map((b) => (
              <li key={b.path} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)]">
                <span className="truncate">{new Date(b.createdAt).toLocaleString()}</span>
                <button className="text-[var(--accent)] hover:underline" onClick={() => setRestoreTarget(b)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Export</h3>
        <div className="flex flex-wrap gap-2">
          <a href={api.importExport.exportUrl("json", "all")} className="inline-flex">
            <Button variant="secondary">Export JSON</Button>
          </a>
          <a href={api.importExport.exportUrl("csv", "all")} className="inline-flex">
            <Button variant="secondary">Export CSV</Button>
          </a>
          <a href={api.importExport.exportUrl("html", "all")} className="inline-flex">
            <Button variant="secondary">Export Bookmarks HTML</Button>
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Import</h3>
        <ImportPanel />
      </section>

      <ConfirmDialog
        open={restoreTarget !== null}
        title="Restore this backup?"
        description={`This will overwrite your current data with the backup from ${restoreTarget ? new Date(restoreTarget.createdAt).toLocaleString() : ""}. A safety backup of your current data will be made first.`}
        confirmLabel="Restore"
        destructive
        loading={restoring}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="flex items-center gap-1.5 font-medium">
        {ok !== undefined && (ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />)}
        {value}
      </dd>
    </>
  );
}
