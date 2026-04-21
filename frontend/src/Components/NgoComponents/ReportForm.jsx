import { useState, useEffect, useRef } from "react";
import { useNGO } from "../../Context/NGOContext";
import toast from "react-hot-toast";
import { MdLocationOn, MdClose, MdExpandMore, MdSearch } from "react-icons/md";

// ── Preset categories ─────────────────────────────────────────────
const PRESET_CATEGORIES = [
  "Food shortage","Drinking water","Healthcare","Education",
  "Shelter","Sanitation","Child welfare","Women safety",
  "Elderly care","Disability support","Natural disaster",
  "Environmental hazard","Infrastructure","Employment",
  "Animal welfare","Other",
];

// ── Nominatim search (free, no key) ──────────────────────────────
const searchNominatim = async (q) => {
  if (!q || q.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&accept-language=en`,
      { headers: { "User-Agent": "SamudayLink/1.0" } }
    );
    return (await res.json()).map((item) => ({
      displayName: item.display_name,
      country:  item.address?.country || "",
      state:    item.address?.state   || item.address?.region || "",
      district: item.address?.county  || item.address?.state_district || item.address?.district || "",
      city:     item.address?.city    || item.address?.town || item.address?.village || item.address?.suburb || item.address?.hamlet || "",
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch { return []; }
};

function useDebounce(v, d) {
  const [val, setVal] = useState(v);
  useEffect(() => { const t = setTimeout(() => setVal(v), d); return () => clearTimeout(t); }, [v, d]);
  return val;
}

// ─────────────────────────────────────────────────────────────────
// LocationPicker — search via Nominatim OR fill 4 fields manually
// ─────────────────────────────────────────────────────────────────
function LocationPicker({ value, onChange }) {
  const [mode,         setMode]         = useState("search");
  const [query,        setQuery]        = useState(value.area || "");
  const [suggestions,  setSuggestions]  = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [showDrop,     setShowDrop]     = useState(false);
  const [manual,       setManual]       = useState({
    country: value.country || "", state: value.state || "",
    district: value.district || "", city: value.city || "",
  });
  const ref = useRef(null);
  const debouncedQuery = useDebounce(query, 450);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    searchNominatim(debouncedQuery).then((r) => { setSuggestions(r); setShowDrop(r.length > 0); setSearching(false); });
  }, [debouncedQuery]);

  const buildArea = (city, district, state, country) =>
    [city, district, state, country].filter(Boolean).join(", ");

  const selectSuggestion = (item) => {
    const area = buildArea(item.city, item.district, item.state, item.country);
    onChange({ ...item, area, fullAddress: item.displayName });
    setQuery(area);
    setManual({ country: item.country, state: item.state, district: item.district, city: item.city });
    setShowDrop(false);
  };

  const handleManual = (field, val) => {
    const m = { ...manual, [field]: val };
    setManual(m);
    onChange({ ...m, area: buildArea(m.city, m.district, m.state, m.country), lat: null, lng: null });
  };

  const clear = () => {
    setQuery(""); setSuggestions([]);
    setManual({ country: "", state: "", district: "", city: "" });
    onChange({ country: "", state: "", district: "", city: "", area: "", lat: null, lng: null });
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex gap-2">
        {["search","manual"].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${
              mode === m ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}>
            {m === "search" ? "🔍 Search place" : "✏️ Fill manually"}
          </button>
        ))}
      </div>

      {/* ── Search mode ── */}
      {mode === "search" && (
        <div ref={ref} className="relative">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input type="text" value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              placeholder="Type village, city, district, state… (e.g. Raipur, Chhattisgarh)"
              className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            )}
            {query && !searching && (
              <button type="button" onClick={clear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <MdClose className="size-4" />
              </button>
            )}
          </div>

          {showDrop && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition">
                  <div className="flex items-start gap-2">
                    <MdLocationOn className="text-indigo-400 size-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {[s.city, s.district].filter(Boolean).join(", ") || s.displayName.split(",")[0]}
                      </p>
                      <p className="text-xs text-gray-400">
                        {[s.state, s.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {value.area && (
            <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <MdLocationOn className="text-indigo-500 size-4 flex-shrink-0" />
              <span className="text-xs text-indigo-700 font-medium">{value.area}</span>
              {value.lat && (
                <span className="text-xs text-indigo-400 ml-auto">{value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Manual mode ── */}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Country *</label>
              <input type="text" value={manual.country} list="country-dl"
                onChange={(e) => handleManual("country", e.target.value)}
                placeholder="e.g. India"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <datalist id="country-dl">
                {["India","Bangladesh","Nepal","Sri Lanka","Pakistan","Bhutan","Myanmar"].map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State / Province *</label>
              <input type="text" value={manual.state} list="state-dl"
                onChange={(e) => handleManual("state", e.target.value)}
                placeholder="e.g. Jharkhand"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <datalist id="state-dl">
                {["Uttar Pradesh","Bihar","Madhya Pradesh","Rajasthan","Maharashtra","West Bengal","Gujarat",
                  "Karnataka","Tamil Nadu","Andhra Pradesh","Telangana","Odisha","Jharkhand","Assam",
                  "Punjab","Haryana","Uttarakhand","Himachal Pradesh","Chhattisgarh","Kerala","Delhi",
                  "Goa","Tripura","Manipur","Nagaland","Arunachal Pradesh","Meghalaya","Mizoram","Sikkim"]
                  .map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">District *</label>
              <input type="text" value={manual.district}
                onChange={(e) => handleManual("district", e.target.value)}
                placeholder="e.g. Ranchi"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City / Town / Village *</label>
              <input type="text" value={manual.city}
                onChange={(e) => handleManual("city", e.target.value)}
                placeholder="e.g. Namkum"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          {value.area && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <MdLocationOn className="text-indigo-500 size-4 flex-shrink-0" />
              <span className="text-xs text-indigo-700 font-medium">{value.area}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CategoryPicker — preset list + free-type custom category
// ─────────────────────────────────────────────────────────────────
function CategoryPicker({ value, onChange }) {
  const [input,    setInput]    = useState(value || "");
  const [showDrop, setShowDrop] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = PRESET_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(input.toLowerCase())
  );

  const select = (cat) => { setInput(cat); onChange(cat); setShowDrop(false); };
  const clear  = () => { setInput(""); onChange(""); };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input type="text" value={input}
          onChange={(e) => { setInput(e.target.value); onChange(e.target.value); setShowDrop(true); }}
          onFocus={() => setShowDrop(true)}
          placeholder="Select a category or type a custom one…"
          className="w-full px-4 py-2.5 pr-9 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <button type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {input
            ? <MdClose className="size-4 hover:text-gray-600" onClick={clear} />
            : <MdExpandMore className="size-4" onClick={() => setShowDrop(!showDrop)} />
          }
        </button>
      </div>

      {showDrop && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {filtered.map((cat) => (
            <button key={cat} type="button" onClick={() => select(cat)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-indigo-50 transition border-b border-gray-50 last:border-0 ${
                value === cat ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700"
              }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {cat}
            </button>
          ))}
          {input && !PRESET_CATEGORIES.some((c) => c.toLowerCase() === input.toLowerCase()) && (
            <button type="button" onClick={() => select(input)}
              className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 font-medium flex items-center gap-2">
              <span className="text-base">＋</span>
              Use "<strong>{input}</strong>" as custom category
            </button>
          )}
          {filtered.length === 0 && !input && (
            <p className="px-4 py-3 text-xs text-gray-400">Type to search or create a category</p>
          )}
        </div>
      )}

      {/* Quick-pick chips */}
      {!value && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PRESET_CATEGORIES.slice(0, 8).map((cat) => (
            <button key={cat} type="button" onClick={() => select(cat)}
              className="text-xs px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition">
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main ReportForm
// ─────────────────────────────────────────────────────────────────
export default function ReportForm() {
  const { addReport } = useNGO();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "",
    location: { country: "", state: "", district: "", city: "", area: "", lat: null, lng: null },
    urgency: 5, affectedHouseholds: "", sourceType: "form",
  });

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const urgencyColor = form.urgency >= 8 ? "text-red-600" : form.urgency >= 5 ? "text-amber-600" : "text-green-600";
  const urgencyLabel = form.urgency >= 8 ? "Critical" : form.urgency >= 5 ? "High" : "Moderate";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())    { toast.error("Please enter a report title."); return; }
    if (!form.category)        { toast.error("Please select or enter a category."); return; }
    if (!form.location.area)   { toast.error("Please enter the location."); return; }

    try {
      setLoading(true);
      await addReport({
        title:              form.title,
        description:        form.description,
        category:           form.category,
        area:               form.location.area,
        country:            form.location.country,
        state:              form.location.state,
        district:           form.location.district,
        city:               form.location.city,
        lat:                form.location.lat,
        lng:                form.location.lng,
        urgency:            Number(form.urgency),
        affectedHouseholds: Number(form.affectedHouseholds) || 0,
        sourceType:         form.sourceType,
      });
      toast.success("Report submitted! Coordinator has been notified.");
      setForm({
        title: "", description: "", category: "",
        location: { country: "", state: "", district: "", city: "", area: "", lat: null, lng: null },
        urgency: 5, affectedHouseholds: "", sourceType: "form",
      });
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Submit Report</h1>
        <p className="text-gray-500 text-sm mt-1">
          Document a community need. Be as specific as possible about the location.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report title <span className="text-red-500">*</span>
            </label>
            <input name="title" type="text" value={form.title} onChange={set} required
              placeholder="e.g. Acute food shortage affecting 30 households"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <CategoryPicker value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-400 font-normal">Search by name or fill in manually</span>
            </label>
            <LocationPicker value={form.location} onChange={(loc) => setForm((f) => ({ ...f, location: loc }))} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={set} rows={4}
              placeholder="Who is affected, since when, what immediate help is needed…"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency:{" "}
              <span className={`font-bold ${urgencyColor}`}>
                {form.urgency}/10 — {urgencyLabel}
              </span>
            </label>
            <input name="urgency" type="range" min="1" max="10" value={form.urgency}
              onChange={set} className="w-full accent-indigo-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low (1)</span><span>Moderate (5)</span><span>Critical (10)</span>
            </div>
          </div>

          {/* Affected households + source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected households</label>
              <input name="affectedHouseholds" type="number" min="0"
                value={form.affectedHouseholds} onChange={set} placeholder="e.g. 30"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source type</label>
              <select name="sourceType" value={form.sourceType} onChange={set}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="form">Digital form</option>
                <option value="ocr">Paper survey (OCR)</option>
                <option value="csv">CSV import</option>
                <option value="mobile">Mobile field report</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </span>
            ) : "Submit Report →"}
          </button>
        </form>
      </div>
    </div>
  );
}