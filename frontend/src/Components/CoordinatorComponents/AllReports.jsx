import { useState } from "react";
import { useCoordinator } from "../../Context/CoordinatorContext";
import { HiDocumentReport } from "react-icons/hi";
import { MdSearch, MdFilterList } from "react-icons/md";

const URGENCY_COLOR = (u) => {
  const v = Number(u);
  if (v >= 8) return "bg-red-100 text-red-700";
  if (v >= 5) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
};

const STATUS_COLOR = (s) => {
  if (s === "resolved") return "bg-green-100 text-green-700";
  if (s === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
};

export default function AllReports() {
  const { allReports, loading } = useCoordinator();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Unique categories from data
  const categories = ["all", ...new Set(allReports.map((r) => r.category).filter(Boolean))];

  const filtered = allReports
    .filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        r.area?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.orgName?.toLowerCase().includes(q);
      const matchCat    = filterCat === "all" || r.category === filterCat;
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchUrgency =
        filterUrgency === "all" ||
        (filterUrgency === "critical" && Number(r.urgency) >= 8) ||
        (filterUrgency === "high"     && Number(r.urgency) >= 5 && Number(r.urgency) < 8) ||
        (filterUrgency === "moderate" && Number(r.urgency) < 5);
      return matchSearch && matchCat && matchStatus && matchUrgency;
    })
    .sort((a, b) => {
      if (sortBy === "urgency") return Number(b.urgency) - Number(a.urgency);
      if (sortBy === "area")    return (a.area || "").localeCompare(b.area || "");
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">All Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} of {allReports.length} reports shown
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
          <input
            type="text"
            placeholder="Search title, area, NGO…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* Category */}
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* Urgency */}
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="all">All urgency</option>
          <option value="critical">Critical (8+)</option>
          <option value="high">High (5–7)</option>
          <option value="moderate">Moderate (&lt;5)</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="date">Newest first</option>
          <option value="urgency">Highest urgency</option>
          <option value="area">By area</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <HiDocumentReport className="size-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No reports match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Area</th>
                  <th className="text-left px-4 py-3">Urgency</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">NGO</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Households</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{r.title}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.category || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.area || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${URGENCY_COLOR(r.urgency)}`}>
                        {r.urgency}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR(r.status)}`}>
                        {r.status?.replace("_", " ") || "open"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell truncate max-w-[120px]">{r.orgName || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">{r.affectedHouseholds || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell whitespace-nowrap">
                      {r.createdAt?.seconds
                        ? new Date(r.createdAt.seconds * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}