import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeEntryWithDetails } from "@/stores/timeStore";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/tauri";

interface EditTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntryWithDetails;
  onUpdate: () => void;
}

function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTime(dateTimeString: string): number {
  const date = new Date(dateTimeString);
  return Math.floor(date.getTime() / 1000);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function EditTimeEntryDialog({
  open,
  onOpenChange,
  entry,
  onUpdate,
}: EditTimeEntryDialogProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && entry) {
      setStartTime(formatDateTimeLocal(entry.start_time));
      if (entry.end_time) {
        setEndTime(formatDateTimeLocal(entry.end_time));
      } else {
        setEndTime("");
      }
    }
  }, [open, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime) return;

    const startTimestamp = parseDateTime(startTime);
    const endTimestamp = endTime ? parseDateTime(endTime) : null;

    // Validate that end time is after start time
    if (endTimestamp && endTimestamp <= startTimestamp) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke("update_time_entry", {
        id: entry.id,
        startTime: startTimestamp,
        endTime: endTimestamp,
      });
      toast.success("Time entry updated");
      onUpdate();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to update time entry");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate duration for preview
  const previewDuration = (() => {
    if (!startTime) return null;
    const start = parseDateTime(startTime);
    const end = endTime ? parseDateTime(endTime) : Math.floor(Date.now() / 1000);
    const duration = end - start;
    return duration > 0 ? duration : null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="h-2 w-2"
                style={{ backgroundColor: entry.project_color }}
              />
              <span className="font-medium">{entry.task_name}</span>
              <span className="text-muted-foreground">• {entry.project_name}</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-time">
                End Time {!entry.end_time && "(currently tracking)"}
              </Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-mono"
                placeholder={!entry.end_time ? "Leave empty to keep tracking" : undefined}
              />
            </div>
            {previewDuration && (
              <div className="rounded border-2 border-border bg-muted p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Duration
                </div>
                <div className="font-mono font-bold">
                  {formatDuration(previewDuration)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!startTime || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

