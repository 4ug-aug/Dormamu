import { TimeEntry, TimeEntryWithDetails, useTimeStore } from "@/stores/timeStore";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useRef } from "react";

export function useTimeTracking() {
  const {
    activeEntry,
    isTracking,
    elapsedTime,
    setElapsedTime,
    startTracking: setTrackingState,
    stopTracking: clearTrackingState,
  } = useTimeStore();
  
  const timerRef = useRef<number | null>(null);

  // Fetch active entry on mount
  const fetchActiveEntry = useCallback(async () => {
    try {
      const entry = await invoke<TimeEntryWithDetails | null>("get_active_entry");
      if (entry) {
        setTrackingState(entry);
      } else {
        clearTrackingState();
      }
    } catch (err) {
      console.error("Failed to fetch active entry:", err);
    }
  }, [setTrackingState, clearTrackingState]);

  // Start tracking a task
  const startTracking = useCallback(
    async (taskId: string, taskName: string, projectId: string, projectName: string, projectColor: string) => {
      try {
        const entry = await invoke<TimeEntry>("start_tracking", { taskId });
        const entryWithDetails: TimeEntryWithDetails = {
          ...entry,
          task_name: taskName,
          project_id: projectId,
          project_name: projectName,
          project_color: projectColor,
        };
        setTrackingState(entryWithDetails);
        return entry;
      } catch (err) {
        console.error("Failed to start tracking:", err);
        throw err;
      }
    },
    [setTrackingState]
  );

  // Stop tracking
  const stopTracking = useCallback(async () => {
    try {
      await invoke<TimeEntry | null>("stop_tracking");
      clearTrackingState();
    } catch (err) {
      console.error("Failed to stop tracking:", err);
      throw err;
    }
  }, [clearTrackingState]);

  // Timer effect
  useEffect(() => {
    if (isTracking && activeEntry) {
      // Update elapsed time every second
      timerRef.current = window.setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        setElapsedTime(now - activeEntry.start_time);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, activeEntry, setElapsedTime]);

  // Fetch active entry on mount
  useEffect(() => {
    fetchActiveEntry();
  }, [fetchActiveEntry]);

  return {
    activeEntry,
    isTracking,
    elapsedTime,
    startTracking,
    stopTracking,
    fetchActiveEntry,
  };
}

