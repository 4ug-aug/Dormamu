import CreateProjectDialog from "@/components/CreateProjectDialog";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import ProjectMenu from "@/components/ProjectMenu";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { FolderPlus, Plus } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { tasks, isLoading: tasksLoading } = useTasks();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const isLoading = projectsLoading || tasksLoading;

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc, task) => {
    if (!acc[task.project_id]) {
      acc[task.project_id] = [];
    }
    acc[task.project_id].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const handleAddTask = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCreateTaskOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-secondary p-4">
            <FolderPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium">No projects yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to start tracking time
            </p>
          </div>
          <Button onClick={() => setCreateProjectOpen(true)} className="mt-2">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div className="space-y-8">
          {projects.map((project) => (
            <section key={project.id}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <h2 className="text-lg font-medium">{project.name}</h2>
                  <span className="text-sm text-muted-foreground">
                    {tasksByProject[project.id]?.length || 0} tasks
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddTask(project.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Task
                  </Button>
                  <ProjectMenu project={project} />
                </div>
              </div>

              {/* Task cards grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tasksByProject[project.id]?.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                
                {/* Empty state for project with no tasks */}
                {(!tasksByProject[project.id] ||
                  tasksByProject[project.id].length === 0) && (
                  <button
                    onClick={() => handleAddTask(project.id)}
                    className={cn(
                      "flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border",
                      "text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-sm">Add first task</span>
                  </button>
                )}
              </div>
            </section>
          ))}

          {/* Add project button */}
          <button
            onClick={() => setCreateProjectOpen(true)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8",
              "hover:bg-secondary hover:border-muted-foreground cursor-pointer",
              "text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
            )}
          >
            <FolderPlus className="h-5 w-5" />
            <span>Create New Project</span>
          </button>
        </div>
      )}

      {/* Dialogs */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        projectId={selectedProjectId}
      />
    </div>
  );
}

