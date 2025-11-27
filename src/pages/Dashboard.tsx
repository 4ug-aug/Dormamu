import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChartDataPoint, TimeRange, useDashboard } from "@/hooks/useDashboard";
import { useProjects } from "@/hooks/useProjects";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Timer,
    TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDurationLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(startTime: number, endTime: number | null): string {
  const start = new Date(startTime * 1000);
  const end = endTime ? new Date(endTime * 1000) : new Date();

  const formatHourMin = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return `${formatHourMin(start)} - ${endTime ? formatHourMin(end) : "now"}`;
}

// Transform chart data for recharts (pivot by date with project columns)
function transformChartData(
  data: ChartDataPoint[]
) {
  // Group by date
  const byDate: Record<string, Record<string, number>> = {};
  
  data.forEach((point) => {
    if (!byDate[point.date]) {
      byDate[point.date] = {};
    }
    // Convert seconds to hours for display
    byDate[point.date][point.project_id] = (point.duration / 3600);
  });

  // Convert to array format for recharts
  return Object.entries(byDate)
    .map(([date, projectDurations]) => ({
      date,
      ...projectDurations,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function Dashboard() {
  const {
    stats,
    chartData,
    entries,
    timeRange,
    currentPage,
    isLoading,
    setTimeRange,
    setCurrentPage,
    totalPages,
  } = useDashboard();
  
  const { projects } = useProjects();

  // Create chart config from projects
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    projects.forEach((project) => {
      config[project.id] = {
        label: project.name,
        color: project.color,
      };
    });
    return config;
  }, [projects]);

  // Transform data for the chart
  const transformedChartData = useMemo(
    () => transformChartData(chartData),
    [chartData]
  );

  if (isLoading && !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatDuration(stats.total_time) : "0h 0m"}
            </div>
            <p className="text-xs text-muted-foreground">
              All time tracked
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatDuration(stats.this_month_time) : "0h 0m"}
            </div>
            <p className="text-xs text-muted-foreground">
              Time tracked this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatDuration(stats.avg_daily_time) : "0h 0m"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Distribution</CardTitle>
              <CardDescription>
                Hours tracked per project over time
              </CardDescription>
            </div>
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as TimeRange)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {transformedChartData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Timer className="mx-auto h-8 w-8 mb-2" />
                <p>No data for this time period</p>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart
                data={transformedChartData}
                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value.toFixed(1)}h`}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name) => {
                        const project = projects.find((p) => p.id === name);
                        return (
                          <div className="flex items-center justify-between gap-4">
                            <span>{project?.name || name}</span>
                            <span className="font-mono">
                              {typeof value === "number" ? `${value.toFixed(2)}h` : value}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                {projects.map((project) => (
                  <Area
                    key={project.id}
                    dataKey={project.id}
                    type="monotone"
                    fill={project.color}
                    fillOpacity={0.3}
                    stroke={project.color}
                    strokeWidth={2}
                    stackId="a"
                  />
                ))}
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Time Entries</CardTitle>
          <CardDescription>
            {entries ? `${entries.total} total entries` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries && entries.entries.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.entries.map((entry) => {
                    const duration = entry.end_time
                      ? entry.end_time - entry.start_time
                      : Math.floor(Date.now() / 1000) - entry.start_time;
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {formatDate(entry.start_time)}
                        </TableCell>
                        <TableCell>{entry.task_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: entry.project_color }}
                            />
                            {entry.project_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTimeRange(entry.start_time, entry.end_time)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatDurationLong(duration)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Timer className="mx-auto h-8 w-8 mb-2" />
                <p>No time entries yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

