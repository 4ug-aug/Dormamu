import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTimeStore, Task, TaskWithProject } from "@/stores/timeStore";

export function useTasks() {
  const { tasks, setTasks } = useTimeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<TaskWithProject[]>("get_tasks");
      setTasks(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  }, [setTasks]);

  const createTask = useCallback(
    async (projectId: string, name: string, projectName: string, projectColor: string, description?: string) => {
      try {
        const task = await invoke<Task>("create_task", { 
          projectId, 
          name, 
          description: description || null 
        });
        const taskWithProject: TaskWithProject = {
          ...task,
          project_name: projectName,
          project_color: projectColor,
        };
        setTasks([taskWithProject, ...tasks]);
        return task;
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [tasks, setTasks]
  );

  const updateTask = useCallback(
    async (id: string, name: string, description?: string | null) => {
      try {
        const task = await invoke<Task>("update_task", { id, name, description });
        setTasks(
          tasks.map((t) =>
            t.id === id ? { ...t, name: task.name, description: task.description } : t
          )
        );
        return task;
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [tasks, setTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_task", { id });
        setTasks(tasks.filter((t) => t.id !== id));
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [tasks, setTasks]
  );

  const toggleTaskCompleted = useCallback(
    async (id: string) => {
      try {
        const updatedTask = await invoke<TaskWithProject>("toggle_task_completed", { id });
        setTasks(
          tasks.map((t) =>
            t.id === id ? updatedTask : t
          )
        );
        return updatedTask;
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [tasks, setTasks]
  );

  const getIncompleteTasks = useCallback(async () => {
    try {
      const result = await invoke<TaskWithProject[]>("get_incomplete_tasks");
      return result;
    } catch (err) {
      setError(err as string);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompleted,
    getIncompleteTasks,
  };
}

