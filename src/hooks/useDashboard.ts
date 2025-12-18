import { TimeEntryWithDetails } from "@/stores/timeStore";
import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useState } from "react";

export interface DashboardStats {
  total_time: number;
  this_month_time: number;
  avg_daily_time: number;
  total_entries: number;
}

export interface PaginatedEntries {
  entries: TimeEntryWithDetails[];
  total: number;
  page: number;
  per_page: number;
}

export interface ChartDataPoint {
  date: string;
  project_id: string;
  project_name: string;
  project_color: string;
  duration: number;
}

export interface ProjectTimeAggregate {
  project_id: string;
  project_name: string;
  project_color: string;
  total_duration: number;
}

export interface TaskTimeAggregate {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  project_color: string;
  total_duration: number;
}

export interface AggregatedTimeData {
  by_project: ProjectTimeAggregate[];
  by_task: TaskTimeAggregate[];
}

export type TimeRange = "7d" | "30d" | "90d" | "6m" | "1y";

function getTimestampForRange(range: TimeRange): number {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  switch (range) {
    case "7d":
      return Math.floor((now - 7 * day) / 1000);
    case "30d":
      return Math.floor((now - 30 * day) / 1000);
    case "90d":
      return Math.floor((now - 90 * day) / 1000);
    case "6m":
      return Math.floor((now - 180 * day) / 1000);
    case "1y":
      return Math.floor((now - 365 * day) / 1000);
    default:
      return Math.floor((now - 30 * day) / 1000);
  }
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [entries, setEntries] = useState<PaginatedEntries | null>(null);
  const [aggregatedTime, setAggregatedTime] = useState<AggregatedTimeData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perPage = 10;

  const fetchStats = useCallback(async () => {
    try {
      const result = await invoke<DashboardStats>("get_stats");
      setStats(result);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError(err as string);
    }
  }, []);

  const fetchChartData = useCallback(async (range: TimeRange) => {
    try {
      const startTimestamp = getTimestampForRange(range);
      const endTimestamp = Math.floor(Date.now() / 1000);
      const result = await invoke<ChartDataPoint[]>("get_entries_by_range", {
        startTimestamp,
        endTimestamp,
      });
      setChartData(result);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
      setError(err as string);
    }
  }, []);

  const fetchEntries = useCallback(async (page: number) => {
    try {
      const result = await invoke<PaginatedEntries>("get_all_entries", {
        page,
        perPage,
      });
      setEntries(result);
    } catch (err) {
      console.error("Failed to fetch entries:", err);
      setError(err as string);
    }
  }, []);

  const fetchAggregatedTime = useCallback(async () => {
    try {
      const result = await invoke<AggregatedTimeData>("get_aggregated_time");
      setAggregatedTime(result);
    } catch (err) {
      console.error("Failed to fetch aggregated time:", err);
      setError(err as string);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([
      fetchStats(),
      fetchChartData(timeRange),
      fetchEntries(currentPage),
      fetchAggregatedTime(),
    ]);
    setIsLoading(false);
  }, [fetchStats, fetchChartData, fetchEntries, fetchAggregatedTime, timeRange, currentPage]);

  // Handle time range change
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      fetchChartData(range);
    },
    [fetchChartData]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchEntries(page);
    },
    [fetchEntries]
  );

  // Initial fetch
  useEffect(() => {
    refreshAll();
  }, []);

  // Refetch chart data when time range changes
  useEffect(() => {
    fetchChartData(timeRange);
  }, [timeRange, fetchChartData]);

  return {
    stats,
    chartData,
    entries,
    aggregatedTime,
    timeRange,
    currentPage,
    isLoading,
    error,
    setTimeRange: handleTimeRangeChange,
    setCurrentPage: handlePageChange,
    refreshAll,
    totalPages: entries ? Math.ceil(entries.total / perPage) : 0,
  };
}

