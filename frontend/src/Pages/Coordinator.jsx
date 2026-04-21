import { useState }            from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster }             from "react-hot-toast";
import { CoordinatorProvider } from "../Context/CoordinatorContext";
import CoordSidebar            from "../Components/CoordinatorComponents/CoordSidebar";
import CoordTopbar             from "../Components/CoordinatorComponents/CoordTopbar";
import CoordDashboard          from "../Components/CoordinatorComponents/CoordDashboard";
import AllReports              from "../Components/CoordinatorComponents/AllReports";
import NeedsHeatmap            from "../Components/CoordinatorComponents/NeedsHeatmap";
import AutoMatchDashboard      from "../Components/CoordinatorComponents/AutoMatchDashboard";
import VolunteersPanel         from "../Components/CoordinatorComponents/VolunteersPanel";

// Removed: NeedsManager and TasksManager
// Coordinator never manually manages individual needs/tasks.
// Everything is automated by the matching engine.

export default function Coordinator() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <CoordinatorProvider>
      <Toaster position="top-right" />
      <div className="flex min-h-screen bg-gray-50">
        <CoordSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <CoordTopbar onMenuClick={() => setSidebarOpen((o) => !o)} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route index           element={<CoordDashboard />}     />
              <Route path="reports"  element={<AllReports />}         />
              <Route path="heatmap"  element={<NeedsHeatmap />}       />
              <Route path="matching" element={<AutoMatchDashboard />} />
              <Route path="volunteers" element={<VolunteersPanel />}  />
              <Route path="*"        element={<Navigate to="/coordinator" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </CoordinatorProvider>
  );
}