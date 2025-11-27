import { Outlet, NavLink } from "react-router-dom";
import { Clock, LayoutGrid, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import ActiveTimer from "@/components/ActiveTimer";

export default function Layout() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with active timer */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )
            }
          >
            <LayoutGrid className="h-4 w-4" />
            Tasks
          </NavLink>
          <NavLink
            to="/today"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )
            }
          >
            <Clock className="h-4 w-4" />
            Today
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )
            }
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </NavLink>
        </nav>
        
        <ActiveTimer />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

