/**
 * SamudayLink Smart Matching Engine
 *
 * Scoring formula (100 points total):
 *   Skill match       → 40 pts  (does the volunteer have skills needed for this category?)
 *   Location proximity→ 35 pts  (haversine distance between volunteer and need)
 *   Availability      → 15 pts  (is today in their available days?)
 *   Reliability       →  10 pts  (past task completion rate)
 *
 * A volunteer is considered a match if score >= MATCH_THRESHOLD.
 * Top MAX_ASSIGNMENTS volunteers are auto-assigned per need.
 */

// ── Skills required per need category ────────────────────────────
export const CATEGORY_SKILLS = {
  "Food shortage":   ["Food distribution", "Cooking", "Logistics", "Driving"],
  "Drinking water":  ["Plumbing", "Logistics", "Driving", "Physical labor"],
  "Healthcare":      ["First aid", "Healthcare", "Nursing", "Medicine"],
  "Education":       ["Teaching", "Tutoring", "Child care"],
  "Shelter":         ["Construction", "Carpentry", "Physical labor", "Logistics"],
  "Sanitation":      ["Cleaning", "Physical labor", "Plumbing"],
  "Other":           [],
};

export const ALL_SKILLS = [
  "Food distribution", "Cooking", "Logistics", "Driving",
  "Plumbing", "Physical labor", "First aid", "Healthcare",
  "Nursing", "Medicine", "Teaching", "Tutoring", "Child care",
  "Construction", "Carpentry", "Cleaning",
];

// ── Real GPS coordinates for Gautam Buddh Nagar areas (UP, India) ──
export const AREA_COORDINATES = {
  "Dadri block":    { lat: 28.5552, lng: 77.5739 },
  "Jewar tehsil":   { lat: 28.1263, lng: 77.5550 },
  "Bisrakh":        { lat: 28.5741, lng: 77.4447 },
  "Rabupura":       { lat: 28.2013, lng: 77.5155 },
  "Dankaur":        { lat: 28.2350, lng: 77.5490 },
  "Surajpur":       { lat: 28.5972, lng: 77.4358 },
  "Greater Noida":  { lat: 28.4744, lng: 77.5040 },
  "Noida":          { lat: 28.5355, lng: 77.3910 },
  "Other":          { lat: 28.4595, lng: 77.0266 },
};

export const MATCH_THRESHOLD = 25;  // minimum score to be considered a match
export const MAX_ASSIGNMENTS  = 5;  // max volunteers auto-assigned per need

// ── Haversine formula — straight-line distance between two GPS points ──
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Score a single volunteer against a need ──────────────────────
export function scoreVolunteer(volunteer, need) {
  let score = 0;
  const breakdown = { skill: 0, location: 0, availability: 0, reliability: 0 };

  // 1. SKILL MATCH — 40 pts
  const required = CATEGORY_SKILLS[need.category] || [];
  if (required.length > 0) {
    const volSkills = volunteer.skills || [];
    // Exact match first
    const exactMatched = required.filter((s) => volSkills.includes(s)).length;
    // Fuzzy match for custom skills — checks if any volunteer skill
    // contains a keyword from the required skill (case-insensitive)
    const fuzzyMatched = required.filter((req) =>
      !volSkills.includes(req) &&
      volSkills.some((vs) =>
        vs.toLowerCase().includes(req.split(" ")[0].toLowerCase()) ||
        req.toLowerCase().includes(vs.split(" ")[0].toLowerCase())
      )
    ).length;
    // Fuzzy matches count at half value
    const totalScore = exactMatched + fuzzyMatched * 0.5;
    breakdown.skill = Math.round((totalScore / required.length) * 40);
  } else {
    breakdown.skill = 20; // neutral for uncategorised needs
  }
  score += breakdown.skill;

  // 2. LOCATION PROXIMITY — 35 pts
  const needCoords = need.lat && need.lng
    ? { lat: need.lat, lng: need.lng }
    : AREA_COORDINATES[need.area];

  const volCoords = volunteer.lat && volunteer.lng
    ? { lat: volunteer.lat, lng: volunteer.lng }
    : AREA_COORDINATES[volunteer.area];

  if (needCoords && volCoords) {
    const distKm = haversineKm(volCoords.lat, volCoords.lng, needCoords.lat, needCoords.lng);
    // Full score ≤ 2 km, zero score at 60 km
    const proximity = Math.max(0, 1 - distKm / 60);
    breakdown.location = Math.round(proximity * 35);
  } else if (volunteer.area === need.area) {
    breakdown.location = 35;
  } else {
    breakdown.location = 8;
  }
  score += breakdown.location;

  // 3. AVAILABILITY — 15 pts
  const dayAbbr = new Date().toLocaleDateString("en-US", { weekday: "short" }); // "Mon", "Tue"…
  const avail   = volunteer.availability || [];
  if (volunteer.status === "available" || avail.includes(dayAbbr)) {
    breakdown.availability = 15;
  } else if (avail.length > 0) {
    breakdown.availability = 5; // has some availability, just not today
  }
  score += breakdown.availability;

  // 4. RELIABILITY — 10 pts  (completion rate of past tasks)
  const completed = volunteer.tasksCompleted || 0;
  const total     = volunteer.tasksTotal     || 0;
  if (total > 0) {
    breakdown.reliability = Math.round((completed / total) * 10);
  } else {
    breakdown.reliability = 5; // new volunteer — neutral
  }
  score += breakdown.reliability;

  return {
    score:     Math.round(score * 10) / 10,
    breakdown,
    distanceKm: (() => {
      const needC = need.lat && need.lng ? { lat: need.lat, lng: need.lng } : AREA_COORDINATES[need.area];
      const volC  = volunteer.lat && volunteer.lng ? { lat: volunteer.lat, lng: volunteer.lng } : AREA_COORDINATES[volunteer.area];
      return needC && volC ? Math.round(haversineKm(volC.lat, volC.lng, needC.lat, needC.lng) * 10) / 10 : null;
    })(),
  };
}

// ── Run matching for a need against all volunteers ────────────────
export function runMatching(volunteers, need) {
  const results = volunteers
    .filter((v) => v.status !== "inactive") // exclude inactive
    .map((v) => ({
      volunteer: v,
      ...scoreVolunteer(v, need),
    }))
    .filter((r) => r.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ASSIGNMENTS);

  return results;
}

// ── Explain a match in human-readable text ─────────────────────
export function explainMatch(result) {
  const { score, breakdown, distanceKm, volunteer } = result;
  const reasons = [];
  if (breakdown.skill >= 30)        reasons.push("strong skill match");
  else if (breakdown.skill >= 15)   reasons.push("partial skill match");
  if (breakdown.location >= 30)     reasons.push(distanceKm != null ? `${distanceKm} km away` : "same area");
  else if (breakdown.location >= 20) reasons.push("nearby area");
  if (breakdown.availability === 15) reasons.push("available today");
  if (breakdown.reliability >= 8)   reasons.push("high reliability");
  return `Score ${score}/100 — ${reasons.join(", ") || "general match"}`;
}