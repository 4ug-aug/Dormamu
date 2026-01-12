import { Toaster } from "@/components/ui/sonner";
import Archive from "@/pages/Archive";
import Dashboard from "@/pages/Dashboard";
import Focus from "@/pages/Focus";
import Home from "@/pages/Home";
import Integrations from "@/pages/Integrations";
import Today from "@/pages/Today";
import { Route, Routes } from "react-router-dom";

import IdleDialog from "@/components/IdleDialog";
import Layout from "@/components/Layout";
import SessionNoteDialog from "@/components/SessionNoteDialog";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

interface IdleEvent {
  idle_since: number;
  idle_seconds: number;
}

function App() {
  const { pendingNoteEntryId, clearPendingNote, isTracking } = useTimeTracking();
  const [idleDialogOpen, setIdleDialogOpen] = useState(false);
  const [idleSince, setIdleSince] = useState<number>(0);

  // Listen for idle-detected events from the backend
  useEffect(() => {
    const unlisten = listen<IdleEvent>("idle-detected", (event) => {
      // Only show dialog if we're actively tracking
      if (isTracking) {
        setIdleSince(event.payload.idle_since);
        setIdleDialogOpen(true);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [isTracking]);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/today" element={<Today />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/integrations" element={<Integrations />} />
        </Route>
        <Route path="/focus" element={<Focus />} />
      </Routes>
      <Toaster position="bottom-right" />
      
      {/* Session Note Dialog - appears after stopping tracking */}
      <SessionNoteDialog
        open={!!pendingNoteEntryId}
        onOpenChange={(open) => {
          if (!open) clearPendingNote();
        }}
        timeEntryId={pendingNoteEntryId || ""}
        onNoteSaved={clearPendingNote}
      />

      {/* Idle Detection Dialog */}
      <IdleDialog
        open={idleDialogOpen}
        onOpenChange={setIdleDialogOpen}
        idleSince={idleSince}
      />
    </>
  );
}

export default App;
