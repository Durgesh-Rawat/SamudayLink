import { useState, useEffect, useRef } from "react";
import { useAuth }       from "../Context/AuthContext";
import { db, auth }      from "../firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { signOut }       from "firebase/auth";
import { useNavigate }   from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { FaHome, FaMapMarkerAlt, FaUserCircle, FaSignOutAlt, FaBell } from "react-icons/fa";
import {
  MdCheckCircle, MdPendingActions, MdTask, MdClose,
  MdMyLocation, MdSearch, MdExpandMore, MdLocationOn, MdAdd,
} from "react-icons/md";

import {
  loginUser, requestPermission, onNotificationClick,
  logoutOneSignal, isSubscribed,
} from "../services/notificationService";
import { getUserLocation, reverseGeocode } from "../services/Geocodingservice";
import { ALL_SKILLS, CATEGORY_SKILLS }     from "../services/MatchingEngine";

const NAV = [
  { id: "home",    label: "My tasks",     icon: <FaHome className="size-4" /> },
  { id: "nearby",  label: "Nearby needs", icon: <FaMapMarkerAlt className="size-4" /> },
  { id: "profile", label: "My profile",   icon: <FaUserCircle className="size-4" /> },
];

const URGENCY_COLOR = (u) => {
  const v = Number(u);
  if (v >= 8) return "bg-red-100 text-red-700";
  if (v >= 5) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ── Nominatim search helper ───────────────────────────────────────
async function searchNominatim(q) {
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
}

function useDebounce(v, d) {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return val;
}

// ─────────────────────────────────────────────────────────────────
// LocationPicker — same component used in ReportForm, adapted here
// ─────────────────────────────────────────────────────────────────
function LocationPicker({ value, onChange }) {
  const [mode,      setMode]      = useState(value?.area ? "search" : "search");
  const [query,     setQuery]     = useState(value?.area || "");
  const [suggs,     setSuggs]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);
  const [manual,    setManual]    = useState({
    country:  value?.country  || "",
    state:    value?.state    || "",
    district: value?.district || "",
    city:     value?.city     || "",
  });
  const ref = useRef(null);
  const debounced = useDebounce(query, 450);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!debounced || debounced.length < 3) { setSuggs([]); return; }
    setSearching(true);
    searchNominatim(debounced).then((r) => {
      setSuggs(r);
      setShowDrop(r.length > 0);
      setSearching(false);
    });
  }, [debounced]);

  const buildArea = (city, district, state, country) =>
    [city, district, state, country].filter(Boolean).join(", ");

  const selectSugg = (item) => {
    const area = buildArea(item.city, item.district, item.state, item.country);
    onChange({ ...item, area });
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
    setQuery(""); setSuggs([]);
    setManual({ country: "", state: "", district: "", city: "" });
    onChange({ country: "", state: "", district: "", city: "", area: "", lat: null, lng: null });
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {["search", "manual"].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${
              mode === m ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}>
            {m === "search" ? "🔍 Search place" : "✏️ Fill manually"}
          </button>
        ))}
      </div>

      {/* Search mode */}
      {mode === "search" && (
        <div ref={ref} className="relative">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input type="text" value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
              onFocus={() => suggs.length > 0 && setShowDrop(true)}
              placeholder="Type village, city, district… (e.g. Ranchi, Jharkhand)"
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

          {showDrop && suggs.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              {suggs.map((s, i) => (
                <button key={i} type="button" onClick={() => selectSugg(s)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition">
                  <div className="flex items-start gap-2">
                    <MdLocationOn className="text-indigo-400 size-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {[s.city, s.district].filter(Boolean).join(", ") || s.displayName.split(",")[0]}
                      </p>
                      <p className="text-xs text-gray-400">{[s.state, s.country].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {value?.area && (
            <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <MdLocationOn className="text-indigo-500 size-4 flex-shrink-0" />
              <span className="text-xs text-indigo-700 font-medium flex-1 truncate">{value.area}</span>
              {value.lat && (
                <span className="text-xs text-indigo-400 flex-shrink-0">
                  {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
              <input type="text" value={manual.country} list="vol-country-dl"
                onChange={(e) => handleManual("country", e.target.value)}
                placeholder="e.g. India"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <datalist id="vol-country-dl">
                {["India","Bangladesh","Nepal","Sri Lanka","Pakistan","Bhutan","Myanmar"].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State / Province</label>
              <input type="text" value={manual.state} list="vol-state-dl"
                onChange={(e) => handleManual("state", e.target.value)}
                placeholder="e.g. Jharkhand"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <datalist id="vol-state-dl">
                {["Uttar Pradesh","Bihar","Madhya Pradesh","Rajasthan","Maharashtra",
                  "West Bengal","Gujarat","Karnataka","Tamil Nadu","Andhra Pradesh",
                  "Telangana","Odisha","Jharkhand","Assam","Punjab","Haryana",
                  "Uttarakhand","Himachal Pradesh","Chhattisgarh","Kerala","Delhi",
                  "Goa","Tripura","Manipur","Nagaland","Arunachal Pradesh","Meghalaya",
                  "Mizoram","Sikkim"].map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
              <input type="text" value={manual.district}
                onChange={(e) => handleManual("district", e.target.value)}
                placeholder="e.g. Ranchi"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City / Town / Village</label>
              <input type="text" value={manual.city}
                onChange={(e) => handleManual("city", e.target.value)}
                placeholder="e.g. Namkum"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          {value?.area && (
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
// SkillsPicker — preset chips + add your own custom skill
// ─────────────────────────────────────────────────────────────────
function SkillsPicker({ skills, onChange }) {
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef(null);

  const toggle = (skill) => {
    onChange(
      skills.includes(skill)
        ? skills.filter((s) => s !== skill)
        : [...skills, skill]
    );
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      toast.error("You already have that skill.");
      return;
    }
    onChange([...skills, trimmed]);
    setCustomInput("");
    inputRef.current?.focus();
  };

  const removeSkill = (skill) => onChange(skills.filter((s) => s !== skill));

  const customSkills = skills.filter((s) => !ALL_SKILLS.includes(s));

  return (
    <div className="space-y-3">
      {/* Preset skill chips */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Tap to select preset skills:</p>
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map((s) => (
            <button key={s} type="button" onClick={() => toggle(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                skills.includes(s)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {skills.includes(s) ? "✓ " : ""}{s}
            </button>
          ))}
        </div>
      </div>

      {/* Custom skill input */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Add your own skill:</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Type a skill and press Enter or Add…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button type="button" onClick={addCustom}
            disabled={!customInput.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40">
            <MdAdd className="size-4" /> Add
          </button>
        </div>
      </div>

      {/* Custom skills tags */}
      {customSkills.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Your custom skills:</p>
          <div className="flex flex-wrap gap-2">
            {customSkills.map((s) => (
              <span key={s}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                {s}
                <button type="button" onClick={() => removeSkill(s)}
                  className="ml-0.5 hover:text-purple-900">
                  <MdClose className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All selected skills summary */}
      {skills.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <p className="text-xs text-indigo-700 font-medium">
            {skills.length} skill{skills.length > 1 ? "s" : ""} selected:{" "}
            <span className="font-normal">{skills.join(", ")}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function Volunteer() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [tab,           setTab]           = useState("home");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [assignments,   setAssignments]   = useState([]);
  const [needs,         setNeeds]         = useState([]);
  const [loadingTasks,  setLoadingTasks]  = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notifEnabled,  setNotifEnabled]  = useState(false);
  const [notifLoading,  setNotifLoading]  = useState(false);

  // Editable profile state — pre-fill from Firestore user doc
  const [skills,       setSkills]       = useState(user?.skills       || []);
  const [availability, setAvailability] = useState(user?.availability || []);
  const [status,       setStatus]       = useState(user?.status       || "available");
  // Location as a structured object
  const [location, setLocation] = useState({
    area:     user?.area     || "",
    country:  user?.country  || "",
    state:    user?.state    || "",
    district: user?.district || "",
    city:     user?.city     || "",
    lat:      user?.lat      || null,
    lng:      user?.lng      || null,
  });

  // ── STEP A: Link this device to the user's Firebase UID ───────
  // Called once on mount. Volunteers who previously allowed
  // notifications will be silently re-linked without a prompt.
  useEffect(() => {
    if (!user?.uid) return;

    // Link device → Firebase UID (OneSignal external_id)
    loginUser(user.uid);

    // Reflect current permission state in the UI
    setNotifEnabled(isSubscribed());

    // Listen for notification clicks while the tab is open
    const cleanup = onNotificationClick((event) => {
      const title = event?.notification?.title || "New task matched";
      toast(`🔔 ${title}`, { duration: 5000 });
      setTab("home");
    });

    return cleanup;
  }, [user?.uid]);

  // ── Real-time Firestore listeners ────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "assignments"),
      where("volunteerId", "==", user.uid)
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingTasks(false);
      },
      (err) => { console.error(err); setLoadingTasks(false); }
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "needs"), where("status", "==", "open"));
    return onSnapshot(q, (snap) =>
      setNeeds(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // ── STEP B: Enable notifications (triggered by button tap) ────
  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    try {
      const granted = await requestPermission(user.uid);
      setNotifEnabled(granted);
      if (granted) {
        toast.success("Notifications enabled! You'll be alerted for new matches.");
      } else {
        toast.error("Permission denied. Allow notifications in browser settings.");
      }
    } catch (err) {
      toast.error("Could not enable notifications.");
      console.error(err);
    } finally {
      setNotifLoading(false);
    }
  };

  // ── Respond to assignment (accept / decline) ─────────────────
  const respond = async (assignId, response) => {
    try {
      await updateDoc(doc(db, "assignments", assignId), {
        status: response, respondedAt: serverTimestamp(),
      });
      toast.success(response === "accepted" ? "Task accepted! 🎉" : "Task declined.");
      if (response === "accepted") setTab("home");
    } catch (err) {
      toast.error("Update failed.");
      console.error(err);
    }
  };

  // ── Mark task complete ────────────────────────────────────────
  const markComplete = async (assignId) => {
    try {
      await updateDoc(doc(db, "assignments", assignId), {
        status: "completed", completedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", user.uid), {
        tasksCompleted: (user.tasksCompleted || 0) + 1,
      });
      toast.success("Task complete! Great work 🙌");
    } catch (err) {
      toast.error("Update failed."); console.error(err);
    }
  };

  // ── GPS — detect real location ──────────────────────────────────
  const handleLocate = async () => {
    try {
      const pos      = await getUserLocation();
      const areaName = await reverseGeocode(pos.lat, pos.lng);
      setLocation((l) => ({
        ...l,
        lat:  pos.lat,
        lng:  pos.lng,
        area: areaName
          ? [l.city || areaName, l.district, l.state, l.country].filter(Boolean).join(", ") || areaName
          : l.area,
      }));
      toast.success(`GPS location: ${areaName || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`}`);
    } catch {
      toast.error("Could not get GPS location. Please fill in your area manually.");
    }
  };

  // ── Save profile to Firestore ─────────────────────────────────────
  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        skills,
        availability,
        status,
        area:     location.area     || "",
        country:  location.country  || "",
        state:    location.state    || "",
        district: location.district || "",
        city:     location.city     || "",
        lat:      location.lat,
        lng:      location.lng,
        updatedAt: serverTimestamp(),
      });
      toast.success("Profile saved! Smart matching will use your updated details.");
    } catch (err) {
      toast.error("Save failed."); console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logoutOneSignal(); // unlinks OneSignal external_id
    await signOut(auth);
    navigate("/login");
  };

  const pending   = assignments.filter((a) => a.status === "pending");
  const active    = assignments.filter((a) => a.status === "accepted");
  const completed = assignments.filter((a) => a.status === "completed");
  const declined   = assignments.filter((a) => a.status === "declined");
  const cancelled  = assignments.filter((a) => a.status === "cancelled");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-indigo-900
          transition-all duration-300 flex-shrink-0
          ${sidebarOpen ? "w-60" : "w-0 lg:w-60"} overflow-hidden`}
        style={{ minHeight: "100vh" }}
      >
        <div className="h-[64px] bg-indigo-600 flex items-center gap-3 px-4 flex-shrink-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-sm">SL</div>
          <span className="text-white font-bold whitespace-nowrap">Volunteer</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${tab === n.id
                  ? "bg-white text-indigo-700"
                  : "text-indigo-200 hover:bg-indigo-800 hover:text-white"}`}
            >
              {n.icon}
              <span className="whitespace-nowrap">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-300 hover:bg-indigo-800 hover:text-white transition"
          >
            <FaSignOutAlt className="size-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[64px] bg-indigo-600 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-semibold text-base">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Bell with pending count */}
            <button onClick={() => setTab("home")} className="relative text-white">
              <FaBell className="size-5" />
              {pending.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pending.length}
                </span>
              )}
            </button>

            {/* Notification status dot */}
            <div
              title={notifEnabled ? "Notifications on" : "Notifications off"}
              className={`w-2 h-2 rounded-full ${notifEnabled ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}
            />

            <span className="text-indigo-200 text-sm hidden sm:block">
              {user?.name || user?.email?.split("@")[0]}
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center font-bold text-white text-sm">
              {(user?.name || "V")[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ════════════════ MY TASKS ════════════════ */}
          {tab === "home" && (
            <div className="max-w-3xl mx-auto space-y-5">

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Pending",   value: pending.length,   color: "text-amber-600",  bg: "bg-amber-50",  icon: <MdPendingActions className="size-4 text-amber-500" /> },
                  { label: "Active",    value: active.length,    color: "text-blue-600",   bg: "bg-blue-50",   icon: <MdTask className="size-4 text-blue-500" /> },
                  { label: "Completed", value: completed.length, color: "text-green-600",  bg: "bg-green-50",  icon: <MdCheckCircle className="size-4 text-green-500" /> },
                  { label: "Declined",  value: declined.length + cancelled.length,  color: "text-gray-500",   bg: "bg-gray-50",   icon: <MdClose className="size-4 text-gray-400" /> },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
                    <div className="flex justify-center mb-1">{s.icon}</div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Cancelled notice — another volunteer already completed the task */}
              {cancelled.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <MdClose className="size-4 text-gray-400" />
                    {cancelled.length} task{cancelled.length > 1 ? "s were" : " was"} completed by another volunteer
                  </p>
                  {cancelled.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <span>{a.needTitle} · {a.needArea}</span>
                      <span className="ml-auto bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                        No action needed
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Notification banner if not enabled */}
              {!notifEnabled && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-indigo-800">🔔 Enable push notifications</p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      Get alerted instantly when the system matches you to a community task — even when this tab is closed.
                    </p>
                  </div>
                  <button
                    onClick={handleEnableNotifications}
                    disabled={notifLoading}
                    className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {notifLoading ? "Enabling…" : "Enable →"}
                  </button>
                </div>
              )}

              {/* ── Pending assignments — need response ── */}
              {pending.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    New smart matches — respond now
                  </h2>
                  {pending.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border-2 border-indigo-200 shadow-sm p-4 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">🤝</div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-800">{a.needTitle}</p>
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              Auto-matched
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">📍 {a.needArea}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                            {a.matchScore    != null && <span>🎯 Score: <strong className="text-indigo-600">{a.matchScore}/100</strong></span>}
                            {a.distanceKm    != null && <span>📏 {a.distanceKm} km away</span>}
                            {a.assignedAt?.seconds   && <span>🕐 {new Date(a.assignedAt.seconds * 1000).toLocaleTimeString()}</span>}
                          </div>

                          {/* Score breakdown */}
                          {a.matchBreakdown && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {Object.entries(a.matchBreakdown).map(([k, v]) => (
                                <span key={k} className="text-xs bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                                  {k}: {v}pts
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => respond(a.id, "accepted")}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm transition"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => respond(a.id, "declined")}
                          className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-sm transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Active tasks ── */}
              <div>
                <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Active tasks</h2>
                {loadingTasks ? (
                  <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-400">Loading…</div>
                ) : active.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                    <MdTask className="size-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">No active tasks. The system will notify you when you're matched.</p>
                    <button onClick={() => setTab("profile")} className="mt-3 text-sm text-indigo-600 hover:underline">
                      Update profile to improve your match score →
                    </button>
                  </div>
                ) : (
                  active.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 items-center mb-1">
                            <span className="font-medium text-gray-800 text-sm">{a.needTitle}</span>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">accepted</span>
                          </div>
                          <p className="text-xs text-gray-400">📍 {a.needArea}</p>
                        </div>
                        <button
                          onClick={() => markComplete(a.id)}
                          className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                        >
                          ✓ Mark complete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Completed ── */}
              {completed.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Completed</h2>
                  {completed.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-2 flex items-center gap-3 opacity-60">
                      <MdCheckCircle className="text-green-500 size-5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{a.needTitle}</p>
                        <p className="text-xs text-gray-400">📍 {a.needArea}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ NEARBY NEEDS ════════════════ */}
          {tab === "nearby" && (
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-gray-500 mb-4">
                {needs.length} open need{needs.length !== 1 ? "s" : ""}.
                The system notifies you automatically when you are matched.
              </p>
              {needs.map((n) => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 text-sm">{n.category}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLOR(n.urgencyScore)}`}>
                      Urgency {n.urgencyScore}/10
                    </span>
                    {n.matchedCount > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        {n.matchedCount} matched
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">📍 {n.area} · {n.reportCount || 1} report(s)</p>
                  {n.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.description}</p>
                  )}
                  {CATEGORY_SKILLS[n.category]?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CATEGORY_SKILLS[n.category].map((s) => (
                        <span key={s} className={`text-xs px-1.5 py-0.5 rounded border ${
                          skills.includes(s)
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ════════════════ PROFILE ════════════════ */}
          {tab === "profile" && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

                {/* Avatar + stats */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-2xl">
                    {(user?.name || "V")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-400">{user?.email}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">Volunteer</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status === "available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{completed.length}</p>
                    <p className="text-xs text-gray-400">completed</p>
                  </div>
                </div>

                {/* Notification toggle */}
                <div className="mb-5 p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-3">
                  <FaBell className={`size-5 ${notifEnabled ? "text-indigo-600" : "text-gray-400"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Push notifications</p>
                    <p className="text-xs text-gray-400">
                      {notifEnabled
                        ? "✓ Enabled — you'll be alerted when matched to a task"
                        : "Allow notifications to get instant alerts"}
                    </p>
                  </div>
                  {!notifEnabled && (
                    <button
                      onClick={handleEnableNotifications}
                      disabled={notifLoading}
                      className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      {notifLoading ? "…" : "Enable"}
                    </button>
                  )}
                </div>

                {/* Status */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-700 mb-2">My status</label>
                  <div className="flex gap-2">
                    {["available","busy","inactive"].map((s) => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          status === s
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location — full world location picker */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">
                      My location
                      <span className="ml-1 text-gray-400 font-normal">(used for distance matching)</span>
                    </label>
                    <button type="button" onClick={handleLocate}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium">
                      <MdMyLocation className="size-3.5" /> Use my GPS
                    </button>
                  </div>
                  <LocationPicker
                    value={location}
                    onChange={(loc) => setLocation(loc)}
                  />
                </div>

                {/* Skills — presets + custom */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    My skills
                    <span className="ml-1 text-gray-400 font-normal">(40% of your match score)</span>
                  </label>
                  <SkillsPicker skills={skills} onChange={setSkills} />
                </div>

                {/* Availability days */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Available days</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((d) => (
                      <button key={d}
                        onClick={() => setAvailability((p) =>
                          p.includes(d) ? p.filter((x) => x !== d) : [...p, d]
                        )}
                        className={`w-12 py-1.5 rounded-lg text-xs font-medium transition border ${
                          availability.includes(d)
                            ? "bg-green-600 text-white border-green-600"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={saveProfile} disabled={profileSaving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
                  {profileSaving ? "Saving…" : "Save profile — improve my match score →"}
                </button>
              </div>

              {/* How matching works info card */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-700 leading-relaxed">
                <p className="font-semibold mb-1">💡 How matching works</p>
                Skills (40%) + Distance to need (35%) + Today's availability (15%) + Reliability (10%) = match score out of 100.
                Keeping your profile complete ensures you're matched to the most relevant tasks near you.
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}