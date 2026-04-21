/**
 * NgoContext.jsx
 *
 * addReport() does three things:
 *  1. Saves raw report with full location breakdown (country/state/district/city)
 *  2. If lat/lng not provided by form, geocodes address via Nominatim (free)
 *  3. Aggregates into `needs` collection:
 *       - existing open need for same area+category → bump count + recalculate urgency
 *       - no need yet → create new one with autoMatched:false (triggers matching engine)
 */

import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, orderBy, getDocs, updateDoc, doc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";

const NGOContext = createContext();

// Geocode full address string using Nominatim (free, no key)
async function geocodeFullAddress(area) {
  if (!area) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area)}&format=json&limit=1`,
      { headers: { "User-Agent": "SamudayLink/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* geocoding failure is non-fatal */ }
  return null;
}

export const NGOProvider = ({ children }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "ngo") {
      setReports([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "reports"),
      where("orgId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q,
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error("NgoContext:", err.message); setLoading(false); }
    );
    return () => unsub();
  }, [user]);

  const addReport = async (report) => {
    if (!user) return;

    const urgencyNum = Number(report.urgency) || 1;

    // Resolve coordinates — form may already have lat/lng from Nominatim
    let lat = report.lat || null;
    let lng = report.lng || null;
    if (!lat || !lng) {
      const geo = await geocodeFullAddress(report.area);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    // STEP 1: Save full report with all location breakdown fields
    await addDoc(collection(db, "reports"), {
      title:              report.title              || "",
      description:        report.description        || "",
      category:           report.category           || "",
      // Full area string: "City, District, State, Country"
      area:               report.area               || "",
      // Structured location fields for filtering/display
      country:            report.country            || "",
      state:              report.state              || "",
      district:           report.district           || "",
      city:               report.city               || "",
      lat,
      lng,
      urgency:            urgencyNum,
      affectedHouseholds: Number(report.affectedHouseholds) || 0,
      sourceType:         report.sourceType         || "form",
      orgId:              user.uid,
      orgName:            user.name || user.email   || "",
      status:             "open",
      createdAt:          serverTimestamp(),
    });

    // STEP 2: Aggregate into needs collection
    const existingSnap = await getDocs(
      query(
        collection(db, "needs"),
        where("area",     "==", report.area     || ""),
        where("category", "==", report.category || ""),
        where("status",   "==", "open")
      )
    );

    if (!existingSnap.empty) {
      // Bump existing need
      const needDoc  = existingSnap.docs[0];
      const needData = needDoc.data();
      const newCount   = (needData.reportCount || 1) + 1;
      const newUrgency = Math.min(
        10,
        Math.round(((needData.urgencyScore || 1) * (newCount - 1) + urgencyNum) / newCount)
      );
      await updateDoc(doc(db, "needs", needDoc.id), {
        reportCount:  newCount,
        urgencyScore: newUrgency,
        // Also update coords if need didn't have them before
        ...(lat && !needData.lat ? { lat, lng } : {}),
        autoMatched:  false, // triggers CoordinatorContext matching pipeline
        lastUpdated:  serverTimestamp(),
      });
    } else {
      // Create fresh need — autoMatched:false triggers matching engine
      await addDoc(collection(db, "needs"), {
        area:         report.area         || "",
        category:     report.category     || "",
        country:      report.country      || "",
        state:        report.state        || "",
        district:     report.district     || "",
        city:         report.city         || "",
        urgencyScore: urgencyNum,
        description:  report.description  || "",
        reportCount:  1,
        lat,
        lng,
        status:       "open",
        autoMatched:  false,
        matchedCount: 0,
        createdAt:    serverTimestamp(),
      });
    }
  };

  return (
    <NGOContext.Provider value={{ reports, addReport, loading }}>
      {children}
    </NGOContext.Provider>
  );
};

export const useNGO = () => useContext(NGOContext);