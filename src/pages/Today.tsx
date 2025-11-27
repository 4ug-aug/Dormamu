import EditTimeEntryDialog from "@/components/EditTimeEntryDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { cn } from "@/lib/utils";
import { TimeEntryWithDetails } from "@/stores/timeStore";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const { entriesByTask, totalTimeToday, isLoading, deleteTimeEntry, fetchTodayEntries } =
    useTodayEntries();
  const { isTracking } = useTimeTracking();
  const [editEntry, setEditEntry] = useState<TimeEntryWithDetails | null>(null);

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
        <h1 className="text-2xl font-bold uppercase tracking-wide">Today</h1>
        <div className="mt-2 flex items-center gap-3 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="text-lg">
            Total:{" "}
            <span className="font-mono font-bold text-foreground">
              {formatTime(totalTimeToday)}
            </span>
          </span>
          {isTracking && (
            <span className="text-xs text-muted-foreground uppercase">(tracking)</span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {entriesByTask.length === 0 && (
        <div className="flex h-[calc(100vh-14rem)] flex-col items-center justify-center gap-4 text-center">
          <div className="border-2 border-border p-4 shadow-md">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase">No time tracked today</h2>
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
                        className="h-3 w-3"
                        style={{ backgroundColor: taskGroup.project_color }}
                      />
                      <span className="font-bold uppercase">{taskGroup.task_name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {taskGroup.project_name}
                      </span>
                    </div>
                    <span className="font-mono font-bold">
                      {formatTime(taskGroup.totalTime)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-3 overflow-hidden border-2 border-border bg-muted">
                    <div
                      className="h-full transition-all"
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
            <h2 className="mb-4 text-lg font-bold uppercase">Time Entries</h2>
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
                        "group border-2",
                        isActive && "bg-accent shadow-none translate-x-[2px] translate-y-[2px]"
                      )}
                    >
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {/* Project color */}
                          <div className="relative">
                            <div
                              className="h-3 w-3"
                              style={{ backgroundColor: entry.project_color }}
                            />
                            {isActive && (
                              <span
                                className="tracking-pulse absolute inset-0"
                                style={{ backgroundColor: entry.project_color }}
                              />
                            )}
                          </div>

                          {/* Task info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold uppercase">
                                {entry.task_name}
                              </span>
                              {isActive && (
                                <span className="border border-border bg-background px-1.5 py-0.5 text-xs font-bold uppercase">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {entry.project_name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Time range */}
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatTimeRange(entry.start_time, entry.end_time)}
                          </span>

                          {/* Duration */}
                          <span className="min-w-[70px] text-right font-mono font-bold text-sm">
                            {formatDetailedTime(duration)}
                          </span>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            {/* Edit button */}
                            <Button
                              variant="outline"
                              size="icon-sm"
                              onClick={() => setEditEntry(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            {/* Delete button (only for completed entries) */}
                            {!isActive && (
                              <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Time Entry Dialog */}
      {editEntry && (
        <EditTimeEntryDialog
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          entry={editEntry}
          onUpdate={fetchTodayEntries}
        />
      )}
    </div>
  );
}
