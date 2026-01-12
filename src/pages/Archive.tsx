import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/hooks/useTasks";
import { TaskWithProject } from "@/stores/timeStore";
import { Archive, ArchiveRestore, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ITEMS_PER_PAGE = 50;

// Memoized task row component to prevent re-renders
function ArchivedTaskRow({
  task,
  onUnarchive,
  onDelete,
}: {
  task: TaskWithProject;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border-2 border-border bg-card p-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: task.project_color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold uppercase tracking-wide truncate">
            {task.name}
          </h3>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {task.project_name}
            {task.archived_at && (
              <span className="ml-2">
                • Archived {formatDate(task.archived_at)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnarchive(task.id)}
        >
          <ArchiveRestore className="mr-2 h-4 w-4" />
          Unarchive
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-2 border-border shadow-md">
            <DropdownMenuItem
              onClick={() => onDelete(task.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const { fetchArchivedTasks, unarchiveTask, deleteTask, fetchTasks } = useTasks();
  const [archivedTasks, setArchivedTasks] = useState<TaskWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadArchivedTasks = async () => {
      setIsLoading(true);
      try {
        const tasks = await fetchArchivedTasks();
        setArchivedTasks(tasks);
      } finally {
        setIsLoading(false);
      }
    };
    loadArchivedTasks();
  }, [fetchArchivedTasks]);

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return archivedTasks;
    const query = searchQuery.toLowerCase();
    return archivedTasks.filter(
      (task) =>
        task.name.toLowerCase().includes(query) ||
        task.project_name.toLowerCase().includes(query)
    );
  }, [archivedTasks, searchQuery]);

  // Only render visible items for performance
  const visibleTasks = useMemo(() => {
    return filteredTasks.slice(0, visibleCount);
  }, [filteredTasks, visibleCount]);

  // Load more when scrolling near bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;

    if (isNearBottom && visibleCount < filteredTasks.length) {
      setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredTasks.length));
    }
  }, [visibleCount, filteredTasks.length]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery]);

  const handleUnarchive = useCallback(async (id: string) => {
    await unarchiveTask(id);
    setArchivedTasks((prev) => prev.filter((t) => t.id !== id));
    await fetchTasks(); // Refresh main task list
  }, [unarchiveTask, fetchTasks]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTask(id);
    setArchivedTasks((prev) => prev.filter((t) => t.id !== id));
  }, [deleteTask]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Archived Tasks</h1>
          <span className="text-sm text-muted-foreground">
            {filteredTasks.length === archivedTasks.length
              ? `${archivedTasks.length} task${archivedTasks.length !== 1 ? "s" : ""}`
              : `${filteredTasks.length} of ${archivedTasks.length} tasks`}
          </span>
        </div>
      </div>

      {/* Search bar - only show if there are tasks */}
      {archivedTasks.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search archived tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Empty state */}
      {archivedTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-secondary p-4">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium">No archived tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tasks you archive will appear here
            </p>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-secondary p-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium">No matching tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term
            </p>
          </div>
        </div>
      ) : (
        /* Scrollable task list with virtual loading */
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto space-y-2 pr-1"
          onScroll={handleScroll}
        >
          {visibleTasks.map((task) => (
            <ArchivedTaskRow
              key={task.id}
              task={task}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
            />
          ))}
          
          {/* Load more indicator */}
          {visibleCount < filteredTasks.length && (
            <div className="flex justify-center py-4">
              <span className="text-sm text-muted-foreground">
                Showing {visibleCount} of {filteredTasks.length} tasks. Scroll for more.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
