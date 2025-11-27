import EditTaskDialog from "@/components/EditTaskDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTasks } from "@/hooks/useTasks";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { cn } from "@/lib/utils";
import { TaskWithProject } from "@/stores/timeStore";
import { MoreHorizontal, Pencil, Play, Square, Trash2 } from "lucide-react";
import { useState } from "react";

interface TaskCardProps {
  task: TaskWithProject;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { activeEntry, isTracking, startTracking, stopTracking } = useTimeTracking();
  const { deleteTask } = useTasks();
  const { fetchTodayEntries } = useTodayEntries();
  const [editOpen, setEditOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isActiveTask = isTracking && activeEntry?.task_id === task.id;

  const handleToggleTracking = async () => {
    if (isActiveTask) {
      await stopTracking();
      await fetchTodayEntries();
    } else {
      await startTracking(
        task.id,
        task.name,
        task.project_id,
        task.project_name,
        task.project_color
      );
    }
  };

  const handleDelete = async () => {
    if (isActiveTask) {
      await stopTracking();
    }
    await deleteTask(task.id);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "relative border-2 border-border bg-card p-4 transition-all duration-75 select-none cursor-pointer",
          "shadow-md hover:shadow-sm",
          isPressed && "shadow-none translate-x-[2px] translate-y-[2px]",
          isActiveTask && "bg-accent shadow-none translate-x-[2px] translate-y-[2px]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onClick={handleToggleTracking}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleToggleTracking();
          }
        }}
      >
        {/* Project color indicator - left border */}
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: task.project_color }}
        />

        {/* Active tracking indicator */}
        {isActiveTask && (
          <div className="absolute right-3 top-3">
            <div className="relative flex h-3 w-3">
              <span
                className="tracking-pulse absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: task.project_color }}
              />
              <span
                className="relative inline-flex h-3 w-3 rounded-full"
                style={{ backgroundColor: task.project_color }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pl-2">
          {/* Play/Stop button */}
          <Button
            variant={isActiveTask ? "destructive" : "outline"}
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTracking();
            }}
          >
            {isActiveTask ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>

          {/* Task info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold uppercase tracking-wide">
              {task.name}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              {task.project_name}
            </p>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-2 border-border shadow-md">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditTaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
      />
    </>
  );
}
