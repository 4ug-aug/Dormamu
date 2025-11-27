import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TaskWithProject } from "@/stores/timeStore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditTaskDialog from "@/components/EditTaskDialog";
import { toast } from "sonner";

type FilterType = "all" | "active" | "completed";

export default function Todo() {
  const { tasks, toggleTaskCompleted, deleteTask, fetchTasks } = useTasks();
  const { activeEntry, startTracking, stopTracking } = useTimeTracking();
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);

  // Group tasks by project
  const groupedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === "active") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    });

    const grouped: Record<string, { project: { name: string; color: string }; tasks: TaskWithProject[] }> = {};
    
    filtered.forEach((task) => {
      if (!grouped[task.project_id]) {
        grouped[task.project_id] = {
          project: { name: task.project_name, color: task.project_color },
          tasks: [],
        };
      }
      grouped[task.project_id].tasks.push(task);
    });

    return grouped;
  }, [tasks, filter]);

  const handleToggleComplete = async (task: TaskWithProject) => {
    try {
      await toggleTaskCompleted(task.id);
      toast.success(task.completed ? "Task marked as active" : "Task completed!");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleStartTracking = async (task: TaskWithProject) => {
    try {
      await startTracking(
        task.id,
        task.name,
        task.project_id,
        task.project_name,
        task.project_color
      );
      toast.success(`Started tracking: ${task.name}`);
    } catch {
      toast.error("Failed to start tracking");
    }
  };

  const handleStopTracking = async () => {
    try {
      await stopTracking();
      toast.success("Stopped tracking");
    } catch {
      toast.error("Failed to stop tracking");
    }
  };

  const handleDeleteTask = async (task: TaskWithProject) => {
    try {
      await deleteTask(task.id);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="container mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">TO-DO</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {completedCount} completed
          </p>
        </div>

        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Groups */}
      <div className="space-y-8">
        {Object.entries(groupedTasks).length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {filter === "completed" 
                ? "No completed tasks yet" 
                : filter === "active" 
                ? "All tasks completed!" 
                : "No tasks yet"}
            </p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([projectId, { project, tasks: projectTasks }]) => (
            <div key={projectId} className="space-y-3">
              {/* Project Header */}
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: project.color }}
                />
                <span className="font-bold uppercase tracking-wide text-sm">
                  {project.name}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {projectTasks.length}
                </Badge>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                {projectTasks.map((task) => {
                  const isCurrentlyTracking = activeEntry?.task_id === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`group flex items-start gap-3 rounded-none border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--border))] transition-all ${
                        task.completed ? "opacity-60" : ""
                      } ${isCurrentlyTracking ? "border-primary" : ""}`}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-0.5 h-5 w-5 rounded-none"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold ${task.completed ? "line-through" : ""}`}>
                          {task.name}
                        </div>
                        {task.description && (
                          <p className={`mt-1 text-sm text-muted-foreground ${task.completed ? "line-through" : ""}`}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Play/Stop Button */}
                        {!task.completed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              isCurrentlyTracking
                                ? handleStopTracking()
                                : handleStartTracking(task)
                            }
                          >
                            {isCurrentlyTracking ? (
                              <Square className="h-4 w-4 fill-current" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingTask(task)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTask(task)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Tracking indicator */}
                      {isCurrentlyTracking && (
                        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <EditTaskDialog
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
              fetchTasks();
            }
          }}
          task={editingTask}
        />
      )}
    </div>
  );
}

