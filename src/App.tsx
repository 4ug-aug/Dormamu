import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Today from "@/pages/Today";
import { Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import SessionNoteDialog from "@/components/SessionNoteDialog";
import { useTimeTracking } from "@/hooks/useTimeTracking";

function App() {
  const { pendingNoteEntryId, clearPendingNote } = useTimeTracking();

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/today" element={<Today />} />

          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
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
    </>
  );
}

export default App;
