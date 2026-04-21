import { useState } from "react";
import { useCoordinator } from "../../Context/CoordinatorContext";
import { MdSearch, MdPeople, MdCheckCircle, MdPendingActions } from "react-icons/md";

export default function VolunteersPanel() {
  const { volunteers, assignments, tasks, loading } = useCoordinator();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = volunteers.filter((v) => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.name?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q)
    );
  });

  // Stats per volunteer
  const volunteerStats = (volId) => {
    const volAssignments = assignments.filter((a) => a.volunteerId === volId);
    return {
      total:     volAssignments.length,
      active:    volAssignments.filter((a) => a.status !== "completed").length,
      completed: volAssignments.filter((a) => a.status === "completed").length,
    };
  };

  // Tasks assigned to a volunteer
  const volunteerTasks = (volId) =>
    tasks.filter((t) => t.assignedTo === volId);

  const selectedVolunteer = volunteers.find((v) => v.id === selected);
  const selectedTasks = selected ? volunteerTasks(selected) : [];
  const selectedStats = selected ? volunteerStats(selected) : null;

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Volunteers</h1>
        <p className="text-sm text-gray-400 mt-0.5">{volunteers.length} registered volunteer(s)</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">

        {/* Volunteer list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
              <input
                type="text"
                placeholder="Search volunteers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-[520px]">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <MdPeople className="size-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No volunteers found.</p>
              </div>
            ) : (
              filtered.map((v) => {
                const s = volunteerStats(v.id);
                const isSelected = selected === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelected(isSelected ? null : v.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                      isSelected ? "bg-teal-50 border-l-2 border-teal-500" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm flex-shrink-0">
                      {(v.name || v.email || "V")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{v.name || "—"}</p>
                      <p className="text-xs text-gray-400 truncate">{v.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-teal-600">{s.active} active</p>
                      <p className="text-xs text-gray-400">{s.completed} done</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Volunteer detail */}
        <div className="lg:col-span-3 space-y-4">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-full flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <MdPeople className="size-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Select a volunteer to see details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Volunteer profile card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-2xl">
                    {(selectedVolunteer?.name || "V")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedVolunteer?.name || "—"}</p>
                    <p className="text-sm text-gray-400">{selectedVolunteer?.email}</p>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total tasks",  value: selectedStats.total,     icon: <MdPeople className="text-indigo-500 size-4" /> },
                    { label: "Active",       value: selectedStats.active,    icon: <MdPendingActions className="text-amber-500 size-4" /> },
                    { label: "Completed",    value: selectedStats.completed, icon: <MdCheckCircle className="text-green-500 size-4" /> },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="flex justify-center mb-1">{s.icon}</div>
                      <p className="text-xl font-bold text-gray-800">{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned tasks */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-700 text-sm">
                    Assigned tasks ({selectedTasks.length})
                  </h3>
                </div>
                {selectedTasks.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    No tasks assigned to this volunteer yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selectedTasks.map((t) => (
                      <div key={t.id} className="px-5 py-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t.needArea && `📍 ${t.needArea}`}{t.dueDate && ` · 📅 ${t.dueDate}`}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 items-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            t.priority === "critical" ? "bg-red-100 text-red-700"
                            : t.priority === "high"   ? "bg-amber-100 text-amber-700"
                            :                           "bg-gray-100 text-gray-600"
                          }`}>
                            {t.priority}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            t.status === "completed" ? "bg-green-100 text-green-700"
                            : t.status === "assigned" ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}