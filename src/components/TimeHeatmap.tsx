import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";

interface DailyHours {
  date: string;
  hours: number;
}

interface TimeHeatmapProps {
  weeks?: number; // Number of weeks to show (default 53 = ~1 year)
}

// Get color based on hours (GitHub-style green scale)
function getColor(hours: number): string {
  if (hours === 0) return "var(--heatmap-empty)";
  if (hours < 2) return "var(--heatmap-level-1)";
  if (hours < 4) return "var(--heatmap-level-2)";
  if (hours < 6) return "var(--heatmap-level-3)";
  return "var(--heatmap-level-4)";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatHours(hours: number): string {
  if (hours === 0) return "No activity";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Get month labels for the header
function getMonthLabels(weeks: number): { label: string; colStart: number }[] {
  const labels: { label: string; colStart: number }[] = [];
  const today = new Date();
  
  let currentMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((weeks - 1 - w) * 7));
    const month = weekStart.getMonth();
    
    if (month !== currentMonth) {
      labels.push({
        label: weekStart.toLocaleDateString("en-US", { month: "short" }),
        colStart: w + 1, // 1-indexed for CSS grid
      });
      currentMonth = month;
    }
  }
  
  return labels;
}

export default function TimeHeatmap({ weeks = 53 }: TimeHeatmapProps) {
  const [data, setData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; hours: number; x: number; y: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [weeks]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const days = weeks * 7;
      const result = await invoke<DailyHours[]>("get_daily_hours", { days });
      const map = new Map(result.map((d) => [d.date, d.hours]));
      setData(map);
    } catch (err) {
      console.error("Failed to load heatmap data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate grid cells
  const cells: { date: string; dayOfWeek: number; weekIndex: number }[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  
  // Calculate the start date (first day of first week)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - ((weeks - 1) * 7) - dayOfWeek);

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w * 7 + d);
      
      // Skip future dates
      if (cellDate > today) continue;
      
      const dateStr = cellDate.toISOString().split("T")[0];
      cells.push({
        date: dateStr,
        dayOfWeek: d,
        weekIndex: w,
      });
    }
  }

  const monthLabels = getMonthLabels(weeks);
  const dayLabels = ["Sun", "", "Tue", "", "Thu", "", "Sat"];

  if (isLoading) {
    return (
      <div className="heatmap-container">
        <div className="heatmap-loading">Loading activity data...</div>
      </div>
    );
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-months">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            style={{ gridColumn: m.colStart + 1 }} // +1 for day labels column
          >
            {m.label}
          </span>
        ))}
      </div>
      
      <div className="heatmap-grid-wrapper">
        <div className="heatmap-days">
          {dayLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        
        <div
          className="heatmap-grid"
          style={{
            gridTemplateColumns: `repeat(${weeks}, 1fr)`,
            gridTemplateRows: "repeat(7, 1fr)",
          }}
        >
          {cells.map((cell) => {
            const hours = data.get(cell.date) || 0;
            return (
              <div
                key={cell.date}
                className="heatmap-cell"
                style={{
                  backgroundColor: getColor(hours),
                  gridColumn: cell.weekIndex + 1,
                  gridRow: cell.dayOfWeek + 1,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredCell({
                    date: cell.date,
                    hours,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHoveredCell(null)}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="heatmap-cell" style={{ backgroundColor: "var(--heatmap-empty)" }} />
        <div className="heatmap-cell" style={{ backgroundColor: "var(--heatmap-level-1)" }} />
        <div className="heatmap-cell" style={{ backgroundColor: "var(--heatmap-level-2)" }} />
        <div className="heatmap-cell" style={{ backgroundColor: "var(--heatmap-level-3)" }} />
        <div className="heatmap-cell" style={{ backgroundColor: "var(--heatmap-level-4)" }} />
        <span>More</span>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="heatmap-tooltip"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 8,
          }}
        >
          <strong>{formatHours(hoveredCell.hours)}</strong>
          <span>{formatDate(hoveredCell.date)}</span>
        </div>
      )}
    </div>
  );
}
