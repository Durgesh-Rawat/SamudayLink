import { useCoordinator } from "../../Context/CoordinatorContext";
import { MdAutoFixHigh, MdCheckCircle, MdError, MdPending, MdRefresh } from "react-icons/md";

const LOG_CONFIG = {
  running:       { color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-200",  dot: "bg-blue-500 animate-pulse" },
  matched:       { color: "text-green-700", bg: "bg-green-50",  border: "border-green-200", dot: "bg-green-500" },
  no_match:      { color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-500" },
  no_volunteers: { color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-500" },
  error:         { color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500"  },
};

const RESP_CLASS = (s) =>
  s === "accepted"  ? "bg-green-100 text-green-700"
  : s === "completed" ? "bg-blue-100 text-blue-700"
  : s === "declined"  ? "bg-red-100 text-red-700"
  : "bg-amber-100 text-amber-700";

export default function AutoMatchDashboard() {
  const { matchLog, autoMatching, assignments, volunteers, needs, stats, rematchNeed } = useCoordinator();

  const recentAssignments = [...assignments]
    .sort((a, b) => (b.assignedAt?.seconds || 0) - (a.assignedAt?.seconds || 0))
    .slice(0, 20);

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MdAutoFixHigh className="text-teal-600 size-6" />
            Smart Matching Engine
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Fully automatic — fires whenever NGOs submit reports or coordinator creates a need.
          </p>
        </div>
        {autoMatching && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full text-sm text-teal-700 font-medium">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Matching…
          </div>
        )}
      </div>

      {/* Live stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending response", value: stats.pendingAssign,   color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Accepted",         value: stats.acceptedAssign,  color: "text-green-600", bg: "bg-green-50" },
          { label: "Completed",        value: stats.completedAssign, color: "text-blue-600",  bg: "bg-blue-50" },
          { label: "Active volunteers",value: stats.totalVolunteers, color: "text-indigo-600",bg: "bg-indigo-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* Matching activity log */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Matching activity log</h2>
            <p className="text-xs text-gray-400">Updates every time a report is submitted or need is created</p>
          </div>

          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {matchLog.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <MdAutoFixHigh className="size-10 mx-auto mb-2 opacity-20" />
                <p>No activity yet.</p>
                <p className="text-xs mt-1">Matching fires automatically when reports are submitted.</p>
              </div>
            ) : (
              matchLog.map((log) => {
                const cfg = LOG_CONFIG[log.status] || LOG_CONFIG.running;
                return (
                  <div key={log.id} className={`px-5 py-3 border-l-4 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-gray-800">{log.needCat}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{log.needArea}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            log.urgency >= 8 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            urgency {log.urgency}
                          </span>
                        </div>

                        {log.status === "running" && (
                          <p className="text-xs text-blue-600">Scoring all available volunteers…</p>
                        )}
                        {log.status === "matched" && (
                          <div>
                            <p className="text-xs text-green-700 font-medium">
                              ✓ {log.results?.length || 0} volunteer(s) matched &amp; push sent
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {(log.results || []).map((r, i) => (
                                <span key={i} className="text-xs bg-white border border-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                  {r.name} · {r.score}/100
                                  {r.distanceKm != null ? ` · ${r.distanceKm}km` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(log.status === "no_match" || log.status === "no_volunteers") && (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-amber-700">
                              {log.status === "no_volunteers" ? "No volunteers registered yet." : "No volunteers met the match threshold."}
                            </p>
                            <button onClick={() => rematchNeed(log.needId)}
                              className="text-xs text-teal-600 hover:underline flex items-center gap-0.5">
                              <MdRefresh className="size-3" /> Retry
                            </button>
                          </div>
                        )}
                        {log.status === "error" && (
                          <p className="text-xs text-red-600">{log.error}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {log.startedAt?.toLocaleTimeString?.() || ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Volunteer responses */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Volunteer responses</h2>
            <p className="text-xs text-gray-400">Live — updates as volunteers accept, decline, or complete tasks</p>
          </div>

          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {recentAssignments.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No assignments yet.</div>
            ) : (
              recentAssignments.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs flex-shrink-0">
                    {(a.volunteerName || "V")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 truncate">{a.volunteerName || "—"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESP_CLASS(a.status)}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{a.needTitle} · {a.needArea}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {a.matchScore != null && (
                        <span className="text-xs text-gray-400">score {a.matchScore}/100</span>
                      )}
                      {a.distanceKm != null && (
                        <span className="text-xs text-gray-400">{a.distanceKm}km away</span>
                      )}
                      {a.assignedAt?.seconds && (
                        <span className="text-xs text-gray-400">
                          {new Date(a.assignedAt.seconds * 1000).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">🤖 Complete automated pipeline</h3>
        <div className="grid sm:grid-cols-5 gap-3">
          {[
            { step: "1", title: "NGO submits report", desc: "Auto-creates/updates a Need in Firestore", color: "bg-indigo-600" },
            { step: "2", title: "Need detected",      desc: "CoordinatorContext sees autoMatched=false", color: "bg-teal-600" },
            { step: "3", title: "Volunteers scored",  desc: "Skills + distance + availability + reliability", color: "bg-amber-500" },
            { step: "4", title: "Push sent",          desc: "Top 5 get OneSignal notification instantly", color: "bg-purple-600" },
            { step: "5", title: "Status cascades",    desc: "Accept → in_progress · Complete → resolved", color: "bg-green-600" },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-2">
              <div className={`w-6 h-6 rounded-full ${s.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {s.step}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}