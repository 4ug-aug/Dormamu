import { useState } from "react";
import { Play, Square, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useTasks } from "@/hooks/useTasks";
import { useTodayEntries } from "@/hooks/useTodayEntries";
import { TaskWithProject } from "@/stores/timeStore";
import EditTaskDialog from "@/components/EditTaskDialog";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithProject;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { activeEntry, isTracking, startTracking, stopTracking } = useTimeTracking();
  const { deleteTask } = useTasks();
  const { fetchTodayEntries } = useTodayEntries();
  const [editOpen, setEditOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      <Card
        className={cn(
          "group relative cursor-pointer transition-all duration-200",
          "hover:border-muted-foreground/50",
          isActiveTask && "border-primary/50 bg-secondary"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleToggleTracking}
      >
        {/* Project color indicator */}
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
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

        <CardContent className="flex items-center gap-3 p-4 pl-5">
          {/* Play/Stop button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-full transition-all",
              isActiveTask
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-secondary hover:bg-secondary/80"
            )}
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
            <h3 className="truncate font-medium">{task.name}</h3>
            <p className="text-xs text-muted-foreground">{task.project_name}</p>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0 transition-opacity",
                  isHovered || isActiveTask ? "opacity-100" : "opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      <EditTaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
      />
    </>
  );
}

