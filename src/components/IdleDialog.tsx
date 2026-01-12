import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { invoke } from "@tauri-apps/api/tauri";
import { Clock, Coffee, StopCircle, Timer } from "lucide-react";

interface IdleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idleSince: number; // Unix timestamp when idle started
}

export default function IdleDialog({ open, onOpenChange, idleSince }: IdleDialogProps) {
  const { activeEntry, stopTracking } = useTimeTracking();
  const { fetchTodayEntries } = useTodayEntries();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  const idleDuration = Math.floor(Date.now() / 1000) - idleSince;

  const handleDiscardIdleTime = async () => {
    if (!activeEntry) return;

    // Update the time entry to end at when idle started
    await invoke("update_time_entry", {
      id: activeEntry.id,
      startTime: activeEntry.start_time,
      endTime: idleSince,
    });

    // Stop tracking (don't create a new end time)
    await stopTracking();
    await fetchTodayEntries();
    onOpenChange(false);
  };

  const handleKeepTracking = () => {
    // Just dismiss the dialog, tracking continues
    onOpenChange(false);
  };

  const handleStopNow = async () => {
    await stopTracking();
    await fetchTodayEntries();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-muted-foreground" />
            You've been idle
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>
              No activity detected since <strong>{formatTime(idleSince)}</strong> ({formatDuration(idleDuration)} ago).
            </p>
            {activeEntry && (
              <p className="text-sm">
                Currently tracking: <strong>{activeEntry.task_name}</strong>
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            variant="default"
            className="w-full justify-start"
            onClick={handleDiscardIdleTime}
          >
            <Timer className="mr-2 h-4 w-4" />
            Discard idle time
            <span className="ml-auto text-xs text-muted-foreground">
              Stop at {formatTime(idleSince)}
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleKeepTracking}
          >
            <Clock className="mr-2 h-4 w-4" />
            Keep tracking
            <span className="ml-auto text-xs text-muted-foreground">
              Continue as normal
            </span>
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={handleStopNow}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Stop now
            <span className="ml-auto text-xs text-muted-foreground">
              Include idle time
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
