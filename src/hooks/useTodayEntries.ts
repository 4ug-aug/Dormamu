import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTimeStore, TimeEntryWithDetails } from "@/stores/timeStore";

export function useTodayEntries() {
  const { todayEntries, setTodayEntries } = useTimeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<TimeEntryWithDetails[]>("get_today_entries");
      setTodayEntries(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  }, [setTodayEntries]);

  const deleteTimeEntry = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_time_entry", { id });
        setTodayEntries(todayEntries.filter((e) => e.id !== id));
      } catch (err) {
        setError(err as string);
        throw err;
      }
    },
    [todayEntries, setTodayEntries]
  );

  useEffect(() => {
    fetchTodayEntries();
  }, [fetchTodayEntries]);

  // Calculate total time tracked today
  const totalTimeToday = todayEntries.reduce((total, entry) => {
    const endTime = entry.end_time ?? Math.floor(Date.now() / 1000);
    return total + (endTime - entry.start_time);
  }, 0);

  // Group entries by task
  const entriesByTask = todayEntries.reduce((acc, entry) => {
    const taskId = entry.task_id;
    if (!acc[taskId]) {
      acc[taskId] = {
        task_id: taskId,
        task_name: entry.task_name,
        project_id: entry.project_id,
        project_name: entry.project_name,
        project_color: entry.project_color,
        entries: [],
        totalTime: 0,
      };
    }
    const endTime = entry.end_time ?? Math.floor(Date.now() / 1000);
    acc[taskId].entries.push(entry);
    acc[taskId].totalTime += endTime - entry.start_time;
    return acc;
  }, {} as Record<string, {
    task_id: string;
    task_name: string;
    project_id: string;
    project_name: string;
    project_color: string;
    entries: TimeEntryWithDetails[];
    totalTime: number;
  }>);

  return {
    todayEntries,
    entriesByTask: Object.values(entriesByTask),
    totalTimeToday,
    isLoading,
    error,
    fetchTodayEntries,
    deleteTimeEntry,
  };
}

