import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  created_at: number;
}

export interface TaskWithProject {
  id: string;
  project_id: string;
  name: string;
  created_at: number;
  project_name: string;
  project_color: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  start_time: number;
  end_time: number | null;
}

export interface TimeEntryWithDetails {
  id: string;
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  project_color: string;
  start_time: number;
  end_time: number | null;
}

interface TimeStore {
  // Data
  projects: Project[];
  tasks: TaskWithProject[];
  todayEntries: TimeEntryWithDetails[];
  activeEntry: TimeEntryWithDetails | null;
  
  // UI state
  isTracking: boolean;
  elapsedTime: number;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: TaskWithProject[]) => void;
  setTodayEntries: (entries: TimeEntryWithDetails[]) => void;
  setActiveEntry: (entry: TimeEntryWithDetails | null) => void;
  setIsTracking: (isTracking: boolean) => void;
  setElapsedTime: (time: number) => void;
  
  // Helpers
  startTracking: (entry: TimeEntryWithDetails) => void;
  stopTracking: () => void;
}

export const useTimeStore = create<TimeStore>((set) => ({
  // Initial state
  projects: [],
  tasks: [],
  todayEntries: [],
  activeEntry: null,
  isTracking: false,
  elapsedTime: 0,
  
  // Actions
  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
  setTodayEntries: (entries) => set({ todayEntries: entries }),
  setActiveEntry: (entry) => set({ activeEntry: entry, isTracking: entry !== null }),
  setIsTracking: (isTracking) => set({ isTracking }),
  setElapsedTime: (elapsedTime) => set({ elapsedTime }),
  
  // Helpers
  startTracking: (entry) => set({ 
    activeEntry: entry, 
    isTracking: true,
    elapsedTime: Math.floor(Date.now() / 1000) - entry.start_time
  }),
  stopTracking: () => set({ 
    activeEntry: null, 
    isTracking: false,
    elapsedTime: 0
  }),
}));

