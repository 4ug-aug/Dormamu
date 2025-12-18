import { Button } from "@/components/ui/button";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { Square, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function Focus() {
  const navigate = useNavigate();
  const { activeEntry, isTracking, elapsedTime, stopTracking } = useTimeTracking();
  const { fetchTodayEntries } = useTodayEntries();

  const handleStop = async () => {
    await stopTracking();
    await fetchTodayEntries();
    // Don't navigate immediately - let the note dialog appear
  };

  const handleExit = () => {
    navigate("/");
  };

  // If not tracking, redirect home
  if (!isTracking || !activeEntry) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-2xl text-muted-foreground mb-4">No active timer</p>
          <p className="text-sm text-muted-foreground mb-8">
            Start tracking a task to enter Focus Mode
          </p>
          <Button onClick={handleExit}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center relative">
      {/* Exit button - top right */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
        onClick={handleExit}
      >
        <X className="h-4 w-4 mr-2" />
        Exit Focus
      </Button>

      {/* Main content - centered */}
      <div className="flex flex-col items-center gap-8">
        {/* Large timer */}
        <div 
          className="font-mono text-8xl font-bold tabular-nums tracking-tight"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime(elapsedTime)}
        </div>

        {/* Task info */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3"
              style={{ backgroundColor: activeEntry.project_color }}
            />
            <span className="text-xl font-bold uppercase tracking-wide">
              {activeEntry.task_name}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {activeEntry.project_name}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleStop}
            className="gap-2"
          >
            <Square className="h-5 w-5 fill-current" />
            Stop
          </Button>
        </div>
      </div>

      {/* Subtle tracking indicator - bottom */}
      <div className="absolute bottom-8 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="relative flex h-2 w-2">
          <span
            className="tracking-pulse absolute inline-flex h-full w-full rounded-full"
            style={{ backgroundColor: activeEntry.project_color }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: activeEntry.project_color }}
          />
        </div>
        <span>Tracking</span>
      </div>
    </div>
  );
}
