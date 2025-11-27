import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTimeStore, Project } from "@/stores/timeStore";

export function useProjects() {
  const { projects, setProjects } = useTimeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<Project[]>("get_projects");
      setProjects(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  }, [setProjects]);

  const createProject = useCallback(
    async (name: string, color: string) => {
      try {
        const project = await invoke<Project>("create_project", { name, color });
        setProjects([project, ...projects]);
        return project;
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [projects, setProjects]
  );

  const updateProject = useCallback(
    async (id: string, name: string, color: string) => {
      try {
        const project = await invoke<Project>("update_project", { id, name, color });
        setProjects(projects.map((p) => (p.id === id ? project : p)));
        return project;
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [projects, setProjects]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_project", { id });
        setProjects(projects.filter((p) => p.id !== id));
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [projects, setProjects]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}

