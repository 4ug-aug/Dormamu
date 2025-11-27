import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTodayEntries } from "@/hooks/useTodayEntries";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function ActiveTimer() {
  const { activeEntry, isTracking, elapsedTime, stopTracking } = useTimeTracking();
  const { fetchTodayEntries } = useTodayEntries();

  if (!isTracking || !activeEntry) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono uppercase">
        <span>Not tracking</span>
      </div>
    );
  }

  const handleStop = async () => {
    await stopTracking();
    await fetchTodayEntries();
  };

  return (
    <div className="flex items-center gap-4">
      {/* Tracking indicator */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-3 w-3">
          <span
            className="tracking-pulse absolute inline-flex h-full w-full"
            style={{ backgroundColor: activeEntry.project_color }}
          />
          <span
            className="relative inline-flex h-3 w-3"
            style={{ backgroundColor: activeEntry.project_color }}
          />
        </div>
      </div>

      {/* Task info */}
      <div className="flex items-center gap-2">
        <span className="max-w-[150px] truncate text-sm font-bold uppercase tracking-wide">
          {activeEntry.task_name}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {activeEntry.project_name}
        </span>
      </div>

      {/* Timer display */}
      <div className="font-mono text-lg font-bold tabular-nums border-2 border-border px-3 py-1 bg-card shadow-sm">
        {formatTime(elapsedTime)}
      </div>

      {/* Stop button */}
      <Button
        variant="destructive"
        size="icon-sm"
        onClick={handleStop}
      >
        <Square className="h-4 w-4 fill-current" />
      </Button>
    </div>
  );
}
