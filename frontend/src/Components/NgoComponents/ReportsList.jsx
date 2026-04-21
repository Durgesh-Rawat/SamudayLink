import { useState } from "react";
import { useNGO } from "../../Context/NGOContext";
import { HiDocumentReport } from "react-icons/hi";

export default function ReportsList() {
  const { reports } = useNGO();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const urgencyColor = (u) => {
    const v = Number(u);
    if (v >= 8) return "bg-red-100 text-red-700";
    if (v >= 5) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  const statusColor = (s) => {
    if (s === "resolved") return "bg-green-100 text-green-700";
    if (s === "in_progress") return "bg-blue-100 text-blue-700";
    return "bg-amber-100 text-amber-700";
  };

  const filtered = reports.filter((r) => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.area?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const sorted = [...filtered].sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Reports</h1>
        <p className="text-gray-500 text-sm mt-1">
          {reports.length} total reports submitted by your organisation.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by title, area, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64"
        />
        {["all", "open", "in_progress", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === s
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <HiDocumentReport className="size-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No reports match your filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Area</th>
                <th className="text-left px-5 py-3">Households</th>
                <th className="text-left px-5 py-3">Urgency</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Source</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-50 hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-3 font-medium text-gray-800 max-w-[180px] truncate">
                    {r.title}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{r.category || "—"}</td>
                  <td className="px-5 py-3 text-gray-500">
                    <span className="block text-xs font-medium text-gray-700">
                      {r.city || r.area?.split(",")[0] || "—"}
                    </span>
                    {(r.district || r.state) && (
                      <span className="text-xs text-gray-400">
                        {[r.district, r.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {r.affectedHouseholds || "—"}
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
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(
                        r.status
                      )}`}
                    >
                      {r.status?.replace("_", " ") || "open"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs capitalize">
                    {r.sourceType || "form"}
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