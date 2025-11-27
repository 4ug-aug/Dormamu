import ActiveTimer from "@/components/ActiveTimer";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, LayoutGrid } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

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
