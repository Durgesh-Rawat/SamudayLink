import { useAuth } from "../../Context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";

const PAGE_TITLES = {
  "/ngo": "Dashboard",
  "/ngo/reports": "Submit Report",
  "/ngo/analytics": "My Reports",
  "/ngo/createsurvey": "Upload Survey",
};

export default function Topbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] || "NGO Panel";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    // ✅ Fixed: was bg-blue-600 — now matches sidebar bg-indigo-600
    <div className="h-[64px] bg-indigo-600 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
      {/* Page title — left */}
      <h1 className="text-white font-semibold text-base pl-10 lg:pl-0">
        {title}
      </h1>

      {/* User dropdown — right */}
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className="flex items-center gap-2 text-white hover:text-indigo-200 transition">
          <span className="text-sm hidden sm:block">
            {user?.name || user?.email?.split("@")[0] || "User"}
          </span>
          <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center font-bold text-sm">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </div>
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
            >
              <FaSignOutAlt />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}