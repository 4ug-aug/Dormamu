import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Today from "@/pages/Today";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";

function App() {
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
    </>
  );
}

export default App;
