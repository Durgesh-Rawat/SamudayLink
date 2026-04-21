import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCoordinator } from "../../Context/CoordinatorContext";
import { AREA_COORDINATES } from "../../services/MatchingEngine";
import { getUserLocation, reverseGeocode } from "../../services/Geocodingservice";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdMyLocation, MdRefresh } from "react-icons/md";

const AREAS = Object.keys(AREA_COORDINATES);
const CATEGORIES = ["Food shortage","Drinking water","Healthcare","Education","Shelter","Sanitation","Other"];
const MAP_CENTER = [28.4595, 77.4910];

// Circle color by urgency
const urgencyStyle = (score) => {
  if (score >= 8) return { color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.40, weight: 2 };
  if (score >= 5) return { color: "#d97706", fillColor: "#f59e0b", fillOpacity: 0.35, weight: 2 };
  return              { color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.28, weight: 2 };
};

const URGENCY_LABEL = (s) => s >= 8 ? "Critical" : s >= 5 ? "High" : "Moderate";
const URGENCY_CLASS = (s) =>
  s >= 8 ? "bg-red-100 text-red-700" : s >= 5 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

// Fly to a position when it changes
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.2 });
  }, [position, map]);
  return null;
}

// Map click to pin location
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Load leaflet.heat heatmap overlay from CDN
function HeatmapLayer({ points }) {
  const map    = useMap();
  const layer  = useRef(null);

  useEffect(() => {
    if (!window.L?.heatLayer || points.length === 0) return;
    if (layer.current) map.removeLayer(layer.current);
    layer.current = window.L.heatLayer(points, {
      radius: 40, blur: 25, maxZoom: 14,
      gradient: { 0.2: "#22c55e", 0.5: "#f59e0b", 0.85: "#ef4444", 1.0: "#7f1d1d" },
    }).addTo(map);
    return () => { if (layer.current) map.removeLayer(layer.current); };
  }, [points, map]);

  return null;
}

// Inject leaflet.heat once
let heatScriptLoaded = false;
function useLeafletHeat() {
  const [ready, setReady] = useState(!!window.L?.heatLayer);
  useEffect(() => {
    if (ready || heatScriptLoaded) return;
    heatScriptLoaded = true;
    const s  = document.createElement("script");
    s.src    = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, [ready]);
  return ready;
}

export default function NeedsHeatmap() {
  const { needs, createNeed, rematchNeed, autoMatching } = useCoordinator();
  const heatReady = useLeafletHeat();

  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [userPos,    setUserPos]    = useState(null);
  const [pinnedPos,  setPinnedPos]  = useState(null);
  const [selected,   setSelected]   = useState(null);

  const [form, setForm] = useState({
    area: "", category: "", urgencyScore: 5, description: "", reportCount: 1,
    lat: null, lng: null,
  });

  const handleAreaChange = (e) => {
    const area   = e.target.value;
    const coords = AREA_COORDINATES[area];
    setForm((f) => ({ ...f, area, lat: coords?.lat ?? null, lng: coords?.lng ?? null }));
    if (coords) setPinnedPos([coords.lat, coords.lng]);
  };

  const handleMapClick = (lat, lng) => {
    setPinnedPos([lat, lng]);
    setForm((f) => ({ ...f, lat, lng }));
    toast(`📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`, { duration: 2000 });
  };

  const handleLocate = async () => {
    try {
      const pos      = await getUserLocation();
      setUserPos([pos.lat, pos.lng]);
      setPinnedPos([pos.lat, pos.lng]);
      setForm((f) => ({ ...f, lat: pos.lat, lng: pos.lng }));
      const name = await reverseGeocode(pos.lat, pos.lng);
      const match = AREAS.find((a) => name?.toLowerCase().includes(a.split(" ")[0].toLowerCase()));
      if (match) setForm((f) => ({ ...f, area: match }));
      toast.success("Location detected!");
    } catch {
      toast.error("Could not get location.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.area || !form.category) { toast.error("Area and category are required."); return; }
    try {
      setSaving(true);
      await createNeed({ ...form, urgencyScore: Number(form.urgencyScore) });
      toast.success("Need created! Smart matching running automatically…");
      setShowModal(false);
      setForm({ area: "", category: "", urgencyScore: 5, description: "", reportCount: 1, lat: null, lng: null });
      setPinnedPos(null);
    } catch (err) {
      toast.error("Failed to create need."); console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openNeeds = needs.filter((n) => n.status !== "resolved");

  // Heatmap points: [lat, lng, intensity]
  const heatPoints = openNeeds.map((n) => {
    const c = n.lat && n.lng ? { lat: n.lat, lng: n.lng } : AREA_COORDINATES[n.area];
    return c ? [c.lat, c.lng, (n.urgencyScore || 1) / 10] : null;
  }).filter(Boolean);

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Needs Heatmap</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {openNeeds.length} active needs · Updates live as NGOs submit reports
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLocate}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-3 py-2 rounded-lg transition">
            <MdMyLocation className="size-4" /> My location
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <MdAdd className="size-4" /> New need
          </button>
        </div>
      </div>

      {/* Auto-matching indicator */}
      {autoMatching && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Smart matching engine is running…
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">

        {/* Leaflet Map */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">
              Gautam Buddh Nagar — live urgency map
            </span>
            <div className="flex gap-3 text-xs text-gray-400">
              <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />Critical (8+)</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />High (5–7)</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />Moderate</span>
            </div>
          </div>

          {/* The key fix: z-index on map container prevents it from overlapping modal */}
          <div style={{ height: "420px", zIndex: 0, position: "relative" }}>
            <MapContainer
              center={MAP_CENTER}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {heatReady && heatPoints.length > 0 && (
                <HeatmapLayer points={heatPoints} />
              )}

              <MapClickHandler onMapClick={handleMapClick} />

              {/* Fly to user/pinned location */}
              {userPos  && <FlyToLocation position={userPos} />}

              {/* Pinned position dot (blue) */}
              {pinnedPos && (
                <Circle center={pinnedPos} radius={300}
                  pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.7, weight: 2 }}>
                  <Popup>📍 Selected location</Popup>
                </Circle>
              )}

              {/* Need circles */}
              {openNeeds.map((n) => {
                const coords = n.lat && n.lng
                  ? [n.lat, n.lng]
                  : (() => { const c = AREA_COORDINATES[n.area]; return c ? [c.lat, c.lng] : null; })();
                if (!coords) return null;
                return (
                  <Circle key={n.id} center={coords}
                    radius={n.urgencyScore * 600}
                    pathOptions={urgencyStyle(n.urgencyScore)}
                    eventHandlers={{ click: () => setSelected(selected?.id === n.id ? null : n) }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180, fontFamily: "sans-serif" }}>
                        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.category}</p>
                        <p style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>📍 {n.area}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{
                            background: n.urgencyScore >= 8 ? "#fee2e2" : n.urgencyScore >= 5 ? "#fef3c7" : "#dcfce7",
                            color: n.urgencyScore >= 8 ? "#991b1b" : n.urgencyScore >= 5 ? "#92400e" : "#166534",
                            padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
                          }}>
                            {URGENCY_LABEL(n.urgencyScore)} · {n.urgencyScore}/10
                          </span>
                          <span style={{ background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: 9999, fontSize: 11 }}>
                            {n.matchedCount || 0} volunteers
                          </span>
                        </div>
                        <p style={{ color: "#888", fontSize: 11 }}>{n.reportCount || 1} report(s) · {n.status}</p>
                        {n.description && <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>{n.description.slice(0, 100)}</p>}
                      </div>
                    </Popup>
                  </Circle>
                );
              })}
            </MapContainer>
          </div>

          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            Circle size = urgency · Click circle for details · Click map to pin location for new need
          </div>
        </div>

        {/* Needs panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">
              {selected ? selected.area : `All active (${openNeeds.length})`}
            </h2>
            {selected && (
              <button onClick={() => setSelected(null)} className="text-xs text-teal-600 hover:underline">
                Show all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-96">
            {(selected ? [selected] : openNeeds).length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No active needs. They appear automatically when NGOs submit reports.
              </div>
            ) : (
              (selected ? [selected] : openNeeds).map((n) => (
                <div key={n.id} className="px-5 py-3 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => setSelected(n === selected ? null : n)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{n.category}</p>
                      <p className="text-xs text-gray-400 mt-0.5">📍 {n.area}</p>
                      {n.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          n.matchedCount > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {n.matchedCount || 0} matched
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          n.status === "resolved" ? "bg-green-100 text-green-700"
                          : n.status === "in_progress" ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                        }`}>
                          {n.status}
                        </span>
                        <span className="text-xs text-gray-400">{n.reportCount || 1} report(s)</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_CLASS(n.urgencyScore)}`}>
                        {n.urgencyScore}/10
                      </div>
                      {(!n.matchedCount || n.matchedCount === 0) && n.status === "open" && (
                        <button onClick={(e) => { e.stopPropagation(); rematchNeed(n.id); toast("Re-matching…"); }}
                          className="flex items-center gap-0.5 text-xs text-teal-600 hover:underline">
                          <MdRefresh className="size-3" /> Rematch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Need Modal — z-index must be above map */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-800">Create need manually</h2>
                <p className="text-xs text-gray-400 mt-0.5">Smart matching runs automatically after save</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <MdClose className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Area *</label>
                  <select name="area" value={form.area} onChange={handleAreaChange} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Select area</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                  <select name="category" value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {pinnedPos && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                  📡 GPS pinned: {pinnedPos[0]?.toFixed(5)}, {pinnedPos[1]?.toFixed(5)}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Urgency:{" "}
                  <span className={`font-bold ${form.urgencyScore >= 8 ? "text-red-600" : form.urgencyScore >= 5 ? "text-amber-600" : "text-green-600"}`}>
                    {form.urgencyScore}/10 — {URGENCY_LABEL(Number(form.urgencyScore))}
                  </span>
                </label>
                <input type="range" min="1" max="10" value={form.urgencyScore}
                  onChange={(e) => setForm((f) => ({ ...f, urgencyScore: e.target.value }))}
                  className="w-full accent-teal-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Low</span><span>Critical</span></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the community need…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-xs text-teal-700 space-y-0.5">
                <p className="font-semibold mb-1">🤖 What happens automatically:</p>
                <p>• Matching engine scores all available volunteers</p>
                <p>• Top matches get a push notification instantly</p>
                <p>• When volunteer accepts → task moves to in_progress</p>
                <p>• When task completes → need marked as resolved</p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50">
                  {saving ? "Creating…" : "Create need + auto-match →"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}