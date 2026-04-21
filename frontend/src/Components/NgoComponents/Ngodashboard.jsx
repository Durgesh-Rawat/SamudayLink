import { useNGO } from "../../Context/NGOContext";
import { useAuth } from "../../Context/AuthContext";
import { HiDocumentReport } from "react-icons/hi";
import { MdPendingActions, MdCheckCircle, MdWarning } from "react-icons/md";
import { Link } from "react-router-dom";

export default function NgoDashboard() {
  const { reports } = useNGO();
  const { user } = useAuth();

  const open = reports.filter((r) => r.status === "open").length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const critical = reports.filter((r) => Number(r.urgency) >= 8).length;

  const stats = [
    {
      label: "Total Reports",
      value: reports.length,
      icon: <HiDocumentReport className="size-6" />,
      bg: "bg-indigo-50",
      color: "text-indigo-600",
      border: "border-indigo-100",
    },
    {
      label: "Open",
      value: open,
      icon: <MdPendingActions className="size-6" />,
      bg: "bg-amber-50",
      color: "text-amber-600",
      border: "border-amber-100",
    },
    {
      label: "Resolved",
      value: resolved,
      icon: <MdCheckCircle className="size-6" />,
      bg: "bg-green-50",
      color: "text-green-600",
      border: "border-green-100",
    },
    {
      label: "Critical (8+)",
      value: critical,
      icon: <MdWarning className="size-6" />,
      bg: "bg-red-50",
      color: "text-red-600",
      border: "border-red-100",
    },
  ];

  const urgencyColor = (u) => {
    const v = Number(u);
    if (v >= 8) return "bg-red-100 text-red-700";
    if (v >= 5) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  const recent = [...reports]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  return (
    <div className="p-6 w-full">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {user?.name || user?.email?.split("@")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's what's happening with your reports today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-center gap-4`}
          >
            <div className={`${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent reports table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Reports</h2>
          <Link
            to="/ngo/analytics"
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <HiDocumentReport className="size-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No reports yet. Submit your first one!</p>
            <Link
              to="/ngo/reports"
              className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
            >
              Submit report →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Urgency</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-50 hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {r.title}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {r.category || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${urgencyColor(
                        r.urgency
                      )}`}
                    >
                      {r.urgency}/10
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === "resolved"
                          ? "bg-green-100 text-green-700"
                          : r.status === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status?.replace("_", " ") || "open"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {r.createdAt?.seconds
                      ? new Date(r.createdAt.seconds * 1000).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}