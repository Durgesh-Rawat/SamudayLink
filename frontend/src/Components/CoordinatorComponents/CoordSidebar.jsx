import { Link, useLocation } from "react-router-dom";
import { signOut }    from "firebase/auth";
import { auth }       from "../../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth }    from "../../Context/AuthContext";
import {
  MdDashboard, MdMap, MdPeople, MdAutoFixHigh, MdLogout,
} from "react-icons/md";
import { HiDocumentReport } from "react-icons/hi";

// Removed: Manage Needs and Tasks (coordinator never manually manages these)
const navItems = [
  { to: "/coordinator",            label: "Overview",        icon: <MdDashboard className="size-4" />,      exact: true },
  { to: "/coordinator/reports",    label: "All Reports",     icon: <HiDocumentReport className="size-4" />              },
  { to: "/coordinator/heatmap",    label: "Needs Heatmap",   icon: <MdMap className="size-4" />                         },
  { to: "/coordinator/matching",   label: "Smart Matching",  icon: <MdAutoFixHigh className="size-4" />                 },
  { to: "/coordinator/volunteers", label: "Volunteers",      icon: <MdPeople className="size-4" />                      },
];

export default function CoordSidebar({ open, setOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-teal-900 transition-all duration-300 flex-shrink-0 ${open ? "w-60" : "w-0 lg:w-16"} overflow-hidden`}
        style={{ minHeight: "100vh" }}>

        <div className="h-[64px] bg-teal-700 flex items-center gap-3 px-4 flex-shrink-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0">SL</div>
          {open && (
            <div>
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">Coordinator</p>
              <p className="text-teal-300 text-xs whitespace-nowrap">SamudayLink</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}
              onClick={() => window.innerWidth < 1024 && setOpen(false)}
              title={!open ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive(item.to, item.exact)
                  ? "bg-white text-teal-800"
                  : "text-teal-200 hover:bg-teal-800 hover:text-white"
              }`}>
              <span className="flex-shrink-0">{item.icon}</span>
              {open && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-teal-800 space-y-1">
          {open && <p className="px-3 py-1 text-xs text-teal-400 truncate">{user?.name || user?.email?.split("@")[0]}</p>}
          <button onClick={handleLogout} title={!open ? "Log out" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teal-300 hover:bg-teal-800 hover:text-white transition">
            <MdLogout className="size-4 flex-shrink-0" />
            {open && <span>Log out</span>}
          </button>
        </div>
      </div>
    </>
  );
}