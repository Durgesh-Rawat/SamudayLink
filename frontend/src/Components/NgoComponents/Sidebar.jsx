import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaSignOutAlt } from "react-icons/fa";
import { MdAnalytics, MdCloudUpload } from "react-icons/md";
import { HiDocumentReport } from "react-icons/hi";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

const navItems = [
  { to: "/ngo", label: "Dashboard", icon: <FaHome className="size-4" />, exact: true },
  { to: "/ngo/reports", label: "Submit Report", icon: <HiDocumentReport className="size-4" /> },
  { to: "/ngo/analytics", label: "My Reports", icon: <MdAnalytics className="size-4" /> },
  { to: "/ngo/createsurvey", label: "Upload Survey", icon: <MdCloudUpload className="size-4" /> },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <>
      {/* ✅ Mobile overlay — tap outside to close */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          flex flex-col bg-indigo-900
          transition-all duration-300 ease-in-out
          ${open ? "w-60" : "w-0 lg:w-16"}
          overflow-hidden flex-shrink-0
        `}
        style={{ minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="h-[64px] px-4 bg-indigo-600 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
            SL
          </div>
          {open && (
            <span className="text-white font-bold text-base whitespace-nowrap">
              NGO Panel
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => window.innerWidth < 1024 && setOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${isActive(item.to, item.exact)
                  ? "bg-white text-indigo-700"
                  : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
                }
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {open && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-indigo-800 space-y-2">
          {open && (
            <div className="px-3 py-2 text-xs text-indigo-400 truncate">
              {user?.name || user?.email?.split("@")[0] || "User"}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-300 hover:bg-indigo-800 hover:text-white transition"
          >
            <FaSignOutAlt className="flex-shrink-0 size-4" />
            {open && <span>Log out</span>}
          </button>
        </div>
      </div>

      {/* ✅ Toggle button — floats outside sidebar, always accessible */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}