import Sidebar from "../Components/NgoComponents/Sidebar";
import Topbar from "../Components/NgoComponents/Topbar";
import ReportForm from "../Components/NgoComponents/ReportForm";
import ReportsList from "../Components/NgoComponents/ReportsList";
import CreateSurvey from "../Components/NgoComponents/CreateSurvey";
import NgoDashboard from "../Components/NgoComponents/Ngodashboard";
import { Route, Routes, Navigate } from "react-router-dom";
import { NGOProvider } from "../Context/NGOContext";
import { Toaster } from "react-hot-toast";

export default function Ngo() {
  return (
    <NGOProvider>
      <Toaster position="top-right" />
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route index element={<NgoDashboard />} />
              <Route path="reports" element={<ReportForm />} />
              <Route path="analytics" element={<ReportsList />} />
              <Route path="createsurvey" element={<CreateSurvey />} />
              <Route path="*" element={<Navigate to="/ngo" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </NGOProvider>
  );
}