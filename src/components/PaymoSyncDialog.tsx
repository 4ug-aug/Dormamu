import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import { CloudUpload, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SyncableEntry {
  id: string;
  task_name: string;
  project_name: string;
  paymo_task_id: number;
  start_time: number;
  end_time: number;
  note: string | null;
}

interface PaymoSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymoSyncDialog({
  open,
  onOpenChange,
}: PaymoSyncDialogProps) {
  const [entries, setEntries] = useState<SyncableEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get API key
      const key = await invoke<string | null>("get_setting", { key: "paymo_api_key" });
      setApiKey(key);

      if (key) {
        // Get syncable entries
        const result = await invoke<SyncableEntry[]>("get_syncable_entries");
        setEntries(result);
      }
    } catch (err) {
      console.error("Failed to load sync data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEntry = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(entries.map((e) => e.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleSync = async () => {
    if (selectedIds.size === 0 || !apiKey) return;

    setIsSyncing(true);
    try {
      const count = await invoke<number>("sync_entries_to_paymo", {
        apiKey,
        entryIds: Array.from(selectedIds),
      });
      toast.success(`Synced ${count} time entry(ies) to Paymo`);
      
      // Remove synced entries from list (optional: could reload instead)
      setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(`Sync failed: ${err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClose = () => {
    setEntries([]);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] sm:max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Sync to Paymo
          </DialogTitle>
          <DialogDescription>
            Export time entries to Paymo for tasks imported from Paymo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !apiKey ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Please set up your Paymo API key first using "Import from Paymo".
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-2">
              No time entries to sync.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Only entries from tasks imported from Paymo can be synced.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {entries.length} entry(ies) available
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="max-h-[280px] overflow-y-auto space-y-2 border rounded-md p-3">
              {entries.map((entry) => {
                const duration = entry.end_time - entry.start_time;
                return (
                  <label
                    key={entry.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={() => toggleEntry(entry.id)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {entry.task_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.project_name} • {formatDate(entry.start_time)} • {formatDuration(duration)}
                      </span>
                      {entry.note && (
                        <span className="text-xs text-muted-foreground truncate mt-1">
                          "{entry.note}"
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSync}
                disabled={selectedIds.size === 0 || isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  `Sync ${selectedIds.size} Entry(ies)`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
