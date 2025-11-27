import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Not tracking</span>
      </div>
    );
  }

  const handleStop = async () => {
    await stopTracking();
    await fetchTodayEntries();
  };

  return (
    <div className="flex items-center gap-3">
      {/* Tracking indicator */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span
            className="tracking-pulse absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: activeEntry.project_color }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: activeEntry.project_color }}
          />
        </div>
      </div>

      {/* Task info */}
      <div className="flex items-center gap-2">
        <span className="max-w-[150px] truncate text-sm font-medium">
          {activeEntry.task_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {activeEntry.project_name}
        </span>
      </div>

      {/* Timer display */}
      <div className="font-mono text-lg tabular-nums">
        {formatTime(elapsedTime)}
      </div>

      {/* Stop button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full",
          "bg-destructive/10 text-destructive hover:bg-destructive/20"
        )}
        onClick={handleStop}
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </Button>
    </div>
  );
}

