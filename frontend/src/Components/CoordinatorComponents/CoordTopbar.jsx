import { useLocation } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { MdMenu } from "react-icons/md";

const TITLES = {
  "/coordinator":            "Overview",
  "/coordinator/reports":    "All Reports",
  "/coordinator/heatmap":    "Needs Heatmap",
  "/coordinator/needs":      "Manage Needs",
  "/coordinator/tasks":      "Tasks",
  "/coordinator/volunteers": "Volunteers",
};

export default function CoordTopbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = TITLES[location.pathname] || "Coordinator";

  return (
    <div className="h-[64px] bg-teal-700 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden text-white p-1"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <MdMenu className="size-6" />
        </button>
        <h1 className="text-white font-semibold text-base">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 bg-teal-600 px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-teal-100 font-medium">Live</span>
        </div>
        <span className="text-teal-200 text-sm hidden sm:block">
          {user?.name || user?.email?.split("@")[0]}
        </span>
        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-white text-sm">
          {(user?.name || user?.email || "C")[0].toUpperCase()}
        </div>
      </div>
    </div>
  );
}