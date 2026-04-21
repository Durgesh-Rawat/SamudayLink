/**
 * Geocoding Service — OpenStreetMap Nominatim
 *
 * Completely FREE — no API key, no credit card, no account needed.
 * Nominatim is the official geocoding API for OpenStreetMap.
 *
 * Rate limit: max 1 request/second (fine for this use case)
 * Terms: https://nominatim.org/release-docs/latest/api/Overview/
 */

import { AREA_COORDINATES } from "./matchingEngine";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// ── Geocode area name → GPS coordinates ───────────────────────────
export async function geocodeAddress(address) {
  // First try our known coordinates table (instant, no network)
  const known = AREA_COORDINATES[address];
  if (known) return { ...known, formatted: address };

  try {
    const query = encodeURIComponent(`${address}, Gautam Buddh Nagar, Uttar Pradesh, India`);
    const url   = `${NOMINATIM_BASE}/search?q=${query}&format=json&limit=1&countrycodes=in`;

    const res  = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "SamudayLink/1.0" },
    });
    const data = await res.json();

    if (data.length > 0) {
      return {
        lat:       parseFloat(data[0].lat),
        lng:       parseFloat(data[0].lon),
        formatted: data[0].display_name.split(",")[0],
      };
    }
  } catch (err) {
    console.warn("Nominatim geocoding error:", err.message);
  }

  return null;
}

// ── Reverse geocode GPS → area/locality name ──────────────────────
export async function reverseGeocode(lat, lng) {
  try {
    const url  = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`;
    const res  = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "SamudayLink/1.0" },
    });
    const data = await res.json();

    if (data.address) {
      // Return suburb > village > town > city — whichever is available
      return (
        data.address.suburb    ||
        data.address.village   ||
        data.address.town      ||
        data.address.city      ||
        data.address.county    ||
        data.display_name?.split(",")[0] ||
        "Unknown area"
      );
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode error:", err.message);
  }
  return "Unknown area";
}

// ── Get user's current GPS location from the browser ─────────────
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}