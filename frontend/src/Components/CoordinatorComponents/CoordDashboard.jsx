import { useCoordinator } from "../../Context/CoordinatorContext";
import { Link } from "react-router-dom";
import { MdCheckCircle, MdPendingActions, MdPeople, MdAutoFixHigh } from "react-icons/md";
import { HiDocumentReport } from "react-icons/hi";

const URGENCY_CLASS = (u) =>
  u >= 8 ? "bg-red-100 text-red-700" : u >= 5 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

const STATUS_CLASS = (s) =>
  s === "resolved" || s === "completed" ? "bg-green-100 text-green-700"
  : s === "in_progress" || s === "accepted" ? "bg-blue-100 text-blue-700"
  : "bg-amber-100 text-amber-700";

export default function CoordDashboard() {
  const { stats, allReports, needs, assignments, matchLog, autoMatching, loading } = useCoordinator();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const topNeeds   = needs.filter((n) => n.status !== "resolved").slice(0, 5);
  const recentRpts = allReports.slice(0, 8);

  const statCards = [
    { label: "Reports",          value: stats.totalReports,    color: "text-indigo-600", bg: "bg-indigo-50",  icon: <HiDocumentReport className="size-5" />,    link: "/coordinator/reports" },
    { label: "Open needs",       value: stats.openNeeds,       color: "text-amber-600",  bg: "bg-amber-50",   icon: <MdPendingActions className="size-5" />,    link: "/coordinator/heatmap" },
    { label: "In progress",      value: stats.inProgressNeeds, color: "text-blue-600",   bg: "bg-blue-50",    icon: <MdAutoFixHigh className="size-5" />,       link: "/coordinator/heatmap" },
    { label: "Resolved",         value: stats.resolvedNeeds,   color: "text-green-600",  bg: "bg-green-50",   icon: <MdCheckCircle className="size-5" />,       link: "/coordinator/heatmap" },
    { label: "Volunteers",       value: stats.totalVolunteers, color: "text-purple-600", bg: "bg-purple-50",  icon: <MdPeople className="size-5" />,            link: "/coordinator/volunteers" },
    { label: "Pending responses",value: stats.pendingAssign,   color: "text-red-600",    bg: "bg-red-50",     icon: <MdPendingActions className="size-5" />,    link: "/coordinator/matching" },
    { label: "Accepted tasks",   value: stats.acceptedAssign,  color: "text-teal-600",   bg: "bg-teal-50",    icon: <MdCheckCircle className="size-5" />,       link: "/coordinator/matching" },
    { label: "Completed tasks",  value: stats.completedTasks,  color: "text-green-600",  bg: "bg-green-50",   icon: <MdCheckCircle className="size-5" />,       link: "/coordinator/matching" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Auto-match running banner */}
      {autoMatching && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Smart matching engine is running automatically…
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Link key={s.label} to={s.link}
            className={`rounded-xl border border-gray-100 ${s.bg} p-4 flex items-center gap-3 hover:shadow-sm transition`}>
            <div className={s.color}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500 font-medium leading-tight">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} leading-none mt-0.5`}>{s.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Top urgent needs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Top urgent needs</h2>
            <Link to="/coordinator/heatmap" className="text-xs text-teal-600 hover:underline font-medium">View map →</Link>
          </div>
          {topNeeds.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              No open needs. They appear automatically when NGOs submit reports.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topNeeds.map((n) => (
                <div key={n.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.category}</p>
                    <p className="text-xs text-gray-400">📍 {n.area} · {n.reportCount || 1} report(s)</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${URGENCY_CLASS(n.urgencyScore)}`}>
                    {n.urgencyScore}/10
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS(n.status)}`}>
                    {n.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${n.matchedCount > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {n.matchedCount || 0} matched
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent reports */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Recent NGO reports</h2>
            <Link to="/coordinator/reports" className="text-xs text-teal-600 hover:underline font-medium">View all →</Link>
          </div>
          {recentRpts.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No reports yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {recentRpts.map((r) => (
                <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    Number(r.urgency) >= 8 ? "bg-red-500" : Number(r.urgency) >= 5 ? "bg-amber-500" : "bg-green-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.category} · {r.area} · {r.orgName || "NGO"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${URGENCY_CLASS(r.urgency)}`}>
                    {r.urgency}/10
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent matching activity */}
      {matchLog.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <MdAutoFixHigh className="text-teal-600 size-4" /> Smart matching activity
            </h2>
            <Link to="/coordinator/matching" className="text-xs text-teal-600 hover:underline font-medium">
              Full log →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {matchLog.slice(0, 4).map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  log.status === "matched" ? "bg-green-500"
                  : log.status === "running" ? "bg-blue-500 animate-pulse"
                  : log.status === "no_match" || log.status === "no_volunteers" ? "bg-amber-500"
                  : "bg-red-500"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {log.needCat} — {log.needArea}
                    {log.status === "matched" && (
                      <span className="ml-2 text-xs text-green-600 font-normal">
                        ✓ {log.results?.length || 0} volunteers notified
                      </span>
                    )}
                    {log.status === "no_match" && (
                      <span className="ml-2 text-xs text-amber-600 font-normal">No volunteers matched</span>
                    )}
                    {log.status === "running" && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">Running…</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    Urgency {log.urgency}/10 · {log.startedAt?.toLocaleTimeString?.() || ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}