import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Focus from "@/pages/Focus";
import Home from "@/pages/Home";
import Integrations from "@/pages/Integrations";
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
    </>
  );
}

export default App;
