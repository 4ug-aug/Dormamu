import { Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDetailedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeRange(startTime: number, endTime: number | null): string {
  const start = new Date(startTime * 1000);
  const end = endTime ? new Date(endTime * 1000) : new Date();

  const formatHourMin = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return `${formatHourMin(start)} - ${endTime ? formatHourMin(end) : "now"}`;
}

export default function Today() {
  const { entriesByTask, totalTimeToday, isLoading, deleteTimeEntry } =
    useTodayEntries();
  const { isTracking } = useTimeTracking();

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteTimeEntry(id);
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  const maxTaskTime = Math.max(...entriesByTask.map((t) => t.totalTime), 1);

  return (
    <div className="p-6">
      {/* Header with total time */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Today</h1>
        <div className="mt-2 flex items-center gap-3 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="text-lg">
            Total:{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatTime(totalTimeToday)}
            </span>
          </span>
          {isTracking && (
            <span className="text-xs text-muted-foreground">(tracking)</span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {entriesByTask.length === 0 && (
        <div className="flex h-[calc(100vh-14rem)] flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-secondary p-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium">No time tracked today</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start tracking a task to see your progress here
            </p>
          </div>
        </div>
      )}

      {/* Task summaries */}
      {entriesByTask.length > 0 && (
        <div className="space-y-6">
          {/* Visual summary */}
          <div className="space-y-3">
            {entriesByTask
              .sort((a, b) => b.totalTime - a.totalTime)
              .map((taskGroup) => (
                <div key={taskGroup.task_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: taskGroup.project_color }}
                      />
                      <span className="font-medium">{taskGroup.task_name}</span>
                      <span className="text-muted-foreground">
                        {taskGroup.project_name}
                      </span>
                    </div>
                    <span className="font-mono">
                      {formatTime(taskGroup.totalTime)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(taskGroup.totalTime / maxTaskTime) * 100}%`,
                        backgroundColor: taskGroup.project_color,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/* Detailed entries */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-medium">Time Entries</h2>
            <div className="space-y-2">
              {entriesByTask
                .flatMap((taskGroup) =>
                  taskGroup.entries.map((entry) => ({
                    ...entry,
                    project_color: taskGroup.project_color,
                  }))
                )
                .sort((a, b) => b.start_time - a.start_time)
                .map((entry) => {
                  const duration =
                    (entry.end_time ?? Math.floor(Date.now() / 1000)) -
                    entry.start_time;
                  const isActive = entry.end_time === null;

                  return (
                    <Card
                      key={entry.id}
                      className={cn(
                        "group",
                        isActive && "border-primary/50 bg-secondary"
                      )}
                    >
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {/* Project color */}
                          <div className="relative">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: entry.project_color }}
                            />
                            {isActive && (
                              <span
                                className="tracking-pulse absolute inset-0 rounded-full"
                                style={{ backgroundColor: entry.project_color }}
                              />
                            )}
                          </div>

                          {/* Task info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {entry.task_name}
                              </span>
                              {isActive && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {entry.project_name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Time range */}
                          <span className="text-sm text-muted-foreground">
                            {formatTimeRange(entry.start_time, entry.end_time)}
                          </span>

                          {/* Duration */}
                          <span className="min-w-[60px] text-right font-mono text-sm">
                            {formatDetailedTime(duration)}
                          </span>

                          {/* Delete button (only for completed entries) */}
                          {!isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

