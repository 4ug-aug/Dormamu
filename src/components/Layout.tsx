import ActiveTimer from "@/components/ActiveTimer";
import AsanaImportDialog from "@/components/AsanaImportDialog";
import AsanaSyncDialog from "@/components/AsanaSyncDialog";
import PaymoImportDialog from "@/components/PaymoImportDialog";
import PaymoSyncDialog from "@/components/PaymoSyncDialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIntegrations } from "@/hooks/useIntegrations";
import { TimeEntryWithDetails } from "@/stores/timeStore";
import { save } from "@tauri-apps/api/dialog";
import { writeTextFile } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";
import { Archive, BarChart3, Clipboard, Clock, CloudDownload, CloudUpload, Download, LayoutGrid, MoreVertical, Settings, Trello } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PaginatedEntries {
  entries: TimeEntryWithDetails[];
  total: number;
  page: number;
  per_page: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { integrations, refreshIntegrations } = useIntegrations();
  const [paymoDialogOpen, setPaymoDialogOpen] = useState(false);
  const [paymoSyncDialogOpen, setPaymoSyncDialogOpen] = useState(false);
  const [asanaDialogOpen, setAsanaDialogOpen] = useState(false);
  const [asanaSyncDialogOpen, setAsanaSyncDialogOpen] = useState(false);

  const handleDownloadCSV = async () => {
    try {
      // Fetch all entries (up to 10000)
      const data = await invoke<PaginatedEntries>("get_all_entries", {
        page: 1,
        perPage: 10000,
      });

      if (data.entries.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Build CSV content
      const headers = ["Date", "Start Time", "End Time", "Duration", "Project", "Task", "Note"];
      const rows = data.entries.map((entry) => {
        const duration = (entry.end_time ?? Math.floor(Date.now() / 1000)) - entry.start_time;
        return [
          formatDate(entry.start_time),
          formatTime(entry.start_time),
          entry.end_time ? formatTime(entry.end_time) : "In Progress",
          formatDuration(duration),
          `"${entry.project_name}"`,
          `"${entry.task_name}"`,
          `"${entry.note || ""}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      // Ask user where to save
      const filePath = await save({
        defaultPath: `dormamu-export-${new Date().toISOString().split("T")[0]}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      if (filePath) {
        await writeTextFile(filePath, csvContent);
        toast.success(`Exported ${data.entries.length} entries to CSV`);
      }
    } catch (err) {
      console.error("Failed to export CSV:", err);
      toast.error("Failed to export data");
    }
  };

  const handleCopyToday = async () => {
    try {
      const entries = await invoke<TimeEntryWithDetails[]>("get_today_entries");

      if (entries.length === 0) {
        toast.error("No entries today to copy");
        return;
      }

      // Build formatted text
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Calculate total time
      const totalSeconds = entries.reduce((sum, entry) => {
        const duration = (entry.end_time ?? Math.floor(Date.now() / 1000)) - entry.start_time;
        return sum + duration;
      }, 0);

      // Group by project
      const byProject: Record<string, { project: string; tasks: { name: string; duration: number; note: string | null }[] }> = {};
      
      entries.forEach((entry) => {
        if (!byProject[entry.project_id]) {
          byProject[entry.project_id] = { project: entry.project_name, tasks: [] };
        }
        const duration = (entry.end_time ?? Math.floor(Date.now() / 1000)) - entry.start_time;
        byProject[entry.project_id].tasks.push({
          name: entry.task_name,
          duration,
          note: entry.note,
        });
      });

      // Format output
      let text = `📅 ${today}\n`;
      text += `⏱️ Total: ${formatDuration(totalSeconds)}\n\n`;

      Object.values(byProject).forEach(({ project, tasks }) => {
        const projectTotal = tasks.reduce((sum, t) => sum + t.duration, 0);
        text += `📁 ${project} (${formatDuration(projectTotal)})\n`;
        tasks.forEach((task) => {
          text += `   • ${task.name} - ${formatDuration(task.duration)}`;
          if (task.note) {
            text += `\n     "${task.note}"`;
          }
          text += "\n";
        });
        text += "\n";
      });

      await navigator.clipboard.writeText(text.trim());
      toast.success("Today's activities copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with active timer */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-border px-4">
        <nav className="flex items-center gap-2">
          <NavLink to="/">
            <Button
              variant={location.pathname === "/" ? "default" : "outline"}
              size="sm"
            >
              <LayoutGrid className="h-4 w-4" />
              Tasks
            </Button>
          </NavLink>

          <NavLink to="/today">
            <Button
              variant={location.pathname === "/today" ? "default" : "outline"}
              size="sm"
            >
              <Clock className="h-4 w-4" />
              Today
            </Button>
          </NavLink>
          <NavLink to="/dashboard">
            <Button
              variant={location.pathname === "/dashboard" ? "default" : "outline"}
              size="sm"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Button>
          </NavLink>
          <NavLink to="/archive">
            <Button
              variant={location.pathname === "/archive" ? "default" : "outline"}
              size="sm"
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          </NavLink>
        </nav>
        
        <div className="flex items-center gap-3">
          <ActiveTimer />
          
          {/* Quick Actions Menu */}
          <DropdownMenu onOpenChange={(open) => open && refreshIntegrations()}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCopyToday}>
                <Clipboard className="mr-2 h-4 w-4" />
                Copy Today's Activities
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export All Data as CSV
              </DropdownMenuItem>
              {integrations.paymo.enabled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPaymoDialogOpen(true)}>
                    <CloudDownload className="mr-2 h-4 w-4" />
                    Import from Paymo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPaymoSyncDialogOpen(true)}>
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Sync to Paymo
                  </DropdownMenuItem>
                </>
              )}
              {integrations.asana.enabled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAsanaDialogOpen(true)}>
                    <Trello className="mr-2 h-4 w-4" />
                    Import from Asana
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAsanaSyncDialogOpen(true)}>
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Sync to Asana
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/integrations")}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Integrations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <PaymoImportDialog
            open={paymoDialogOpen}
            onOpenChange={setPaymoDialogOpen}
          />
          <PaymoSyncDialog
            open={paymoSyncDialogOpen}
            onOpenChange={setPaymoSyncDialogOpen}
          />
          <AsanaImportDialog
            open={asanaDialogOpen}
            onOpenChange={setAsanaDialogOpen}
          />
          <AsanaSyncDialog
            open={asanaSyncDialogOpen}
            onOpenChange={setAsanaSyncDialogOpen}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
