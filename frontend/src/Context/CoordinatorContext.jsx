/**
 * CoordinatorContext.jsx
 *
 * Full automation pipeline (no Cloud Functions needed):
 *
 * PIPELINE 1 — Report → Need → Auto-match (triggered by NGO submissions):
 *   NGO submits report
 *     → NgoContext creates/updates a need with autoMatched: false
 *     → useEffect here watches `needs` and fires autoMatch() on any
 *       need where autoMatched === false
 *     → autoMatch scores all volunteers, creates Task + Assignments,
 *       sends OneSignal push, sets need.autoMatched = true
 *
 * PIPELINE 2 — Assignment response cascades:
 *   Volunteer accepts assignment
 *     → assignment.status = "accepted"
 *     → useEffect here detects change → sets task.status = "in_progress"
 *     → need.status = "in_progress"
 *   Volunteer marks task complete
 *     → assignment.status = "completed"
 *     → useEffect checks: if ALL assignments for a task are completed/declined
 *       → sets task.status = "completed"
 *       → sets need.status = "resolved"
 *
 * Coordinator NEVER manually updates statuses or assigns volunteers.
 */

import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from "react";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  updateDoc, doc, serverTimestamp, orderBy, writeBatch,
} from "firebase/firestore";
import { useAuth }                      from "./AuthContext";
import { runMatching, AREA_COORDINATES } from "../services/MatchingEngine";
import { geocodeAddress }               from "../services/Geocodingservice";
import { sendPushToVolunteers }         from "../services/notificationService";

const CoordinatorContext = createContext();

export const CoordinatorProvider = ({ children }) => {
  const { user } = useAuth();

  const [allReports,   setAllReports]   = useState([]);
  const [needs,        setNeeds]        = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [volunteers,   setVolunteers]   = useState([]);
  const [assignments,  setAssignments]  = useState([]);
  const [matchLog,     setMatchLog]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [autoMatching, setAutoMatching] = useState(false);

  // Refs to avoid stale closures in effects
  const volunteersRef   = useRef([]);
  const assignmentsRef  = useRef([]);
  const tasksRef        = useRef([]);
  const needsRef        = useRef([]);
  const processingNeeds = useRef(new Set()); // prevent double-matching

  // ── Firestore listeners ──────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (s) => { setAllReports(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (e) => { console.error("reports:", e.message); setLoading(false); }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "needs"), orderBy("urgencyScore", "desc"));
    return onSnapshot(q, (s) => {
      const data = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNeeds(data);
      needsRef.current = data;
    }, (e) => console.error("needs:", e.message));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (s) => {
      const data = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(data);
      tasksRef.current = data;
    }, (e) => console.error("tasks:", e.message));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "volunteer"));
    return onSnapshot(q, (s) => {
      const data = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setVolunteers(data);
      volunteersRef.current = data;
    }, (e) => console.error("volunteers:", e.message));
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "assignments"), (s) => {
      const data = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAssignments(data);
      assignmentsRef.current = data;
    }, (e) => console.error("assignments:", e.message));
  }, []);

  // ── PIPELINE 1: Watch for unmatched needs → auto-match ──────────
  useEffect(() => {
    const unmatchedNeeds = needs.filter(
      (n) => n.autoMatched === false && n.status === "open"
    );

    for (const need of unmatchedNeeds) {
      if (processingNeeds.current.has(need.id)) continue;
      processingNeeds.current.add(need.id);

      // Mark as being processed immediately to prevent double-run
      updateDoc(doc(db, "needs", need.id), { autoMatched: true }).catch(() => {});

      // Small delay so Firestore write settles before we query volunteers
      setTimeout(() => {
        const currentVols  = volunteersRef.current;
        const currentAssign = assignmentsRef.current;

        const activePerVol = {};
        currentAssign.forEach((a) => {
          if (a.status !== "completed" && a.status !== "declined") {
            activePerVol[a.volunteerId] = (activePerVol[a.volunteerId] || 0) + 1;
          }
        });

        const availableVols = currentVols.filter(
          (v) => (activePerVol[v.id] || 0) < 3 && v.status !== "inactive"
        );

        autoMatch(need.id, need, availableVols).then((matches) => {
          updateDoc(doc(db, "needs", need.id), {
            matchedCount: matches.length,
          }).catch(() => {});
          processingNeeds.current.delete(need.id);
        }).catch(() => {
          processingNeeds.current.delete(need.id);
        });
      }, 1500);
    }
  }, [needs]); // eslint-disable-line

  // ── PIPELINE 2: Assignment changes → cascade task + need status ──
  useEffect(() => {
    if (assignments.length === 0 || tasks.length === 0) return;

    for (const task of tasksRef.current) {
      if (task.status === "completed") continue;

      const taskAssignments = assignmentsRef.current.filter(
        (a) => a.taskId === task.id
      );
      if (taskAssignments.length === 0) continue;

      const hasAccepted  = taskAssignments.some((a) => a.status === "accepted");
      // FIX: ONE volunteer completing = task done. No need to wait for all.
      const anyCompleted = taskAssignments.some((a) => a.status === "completed");

      // Any volunteer accepted → task becomes in_progress
      if (hasAccepted && task.status === "assigned") {
        updateDoc(doc(db, "tasks", task.id), { status: "in_progress" }).catch(() => {});

        if (task.needId) {
          updateDoc(doc(db, "needs", task.needId), { status: "in_progress" }).catch(() => {});

          const inProgressNeed = needsRef.current.find((n) => n.id === task.needId);
          if (inProgressNeed) {
            allReports
              .filter((r) =>
                r.area     === inProgressNeed.area &&
                r.category === inProgressNeed.category &&
                r.status   === "open"
              )
              .forEach((r) => {
                updateDoc(doc(db, "reports", r.id), { status: "in_progress" }).catch(() => {});
              });
          }
        }
      }

      // FIX: As soon as ANY ONE volunteer completes → resolve everything
      if (anyCompleted && task.status !== "completed") {
        // 1. Mark task completed
        updateDoc(doc(db, "tasks", task.id), {
          status:      "completed",
          completedAt: serverTimestamp(),
        }).catch(() => {});

        // 2. Cancel all other assignments that are still pending or accepted
        //    so remaining volunteers know the job is done
        taskAssignments
          .filter((a) => a.status === "pending" || a.status === "accepted")
          .forEach((a) => {
            updateDoc(doc(db, "assignments", a.id), {
              status:      "cancelled",
              cancelledAt: serverTimestamp(),
              cancelReason: "Task completed by another volunteer",
            }).catch(() => {});
          });

        if (task.needId) {
          // 3. Mark need resolved
          updateDoc(doc(db, "needs", task.needId), {
            status:     "resolved",
            resolvedAt: serverTimestamp(),
          }).catch(() => {});

          // 4. Mark all matching reports resolved
          const resolvedNeed = needsRef.current.find((n) => n.id === task.needId);
          if (resolvedNeed) {
            allReports
              .filter((r) =>
                r.area     === resolvedNeed.area &&
                r.category === resolvedNeed.category &&
                r.status   !== "resolved"
              )
              .forEach((r) => {
                updateDoc(doc(db, "reports", r.id), {
                  status:     "resolved",
                  resolvedAt: serverTimestamp(),
                }).catch(() => {});
              });
          }
        }
      }
    }
  }, [assignments, tasks, allReports]); // eslint-disable-line

  // ── Core matching algorithm ──────────────────────────────────────
  const autoMatch = useCallback(async (needId, needData, availableVolunteers) => {
    if (!availableVolunteers || availableVolunteers.length === 0) {
      setMatchLog((prev) => [{
        id: Date.now(), needId,
        needArea: needData.area, needCat: needData.category,
        urgency: needData.urgencyScore, startedAt: new Date(),
        results: [], status: "no_volunteers",
      }, ...prev.slice(0, 19)]);
      return [];
    }

    setAutoMatching(true);
    const logId = Date.now();

    setMatchLog((prev) => [{
      id: logId, needId,
      needArea: needData.area, needCat: needData.category,
      urgency: needData.urgencyScore, startedAt: new Date(),
      results: [], status: "running",
    }, ...prev.slice(0, 19)]);

    try {
      const matches = runMatching(availableVolunteers, needData);

      if (matches.length === 0) {
        setMatchLog((prev) => prev.map((l) =>
          l.id === logId ? { ...l, status: "no_match" } : l
        ));
        return [];
      }

      // Batch: 1 Task + N Assignments
      const batch   = writeBatch(db);
      const taskRef = doc(collection(db, "tasks"));

      batch.set(taskRef, {
        needId,
        needCategory: needData.category,
        needArea:     needData.area,
        needLat:      needData.lat || null,
        needLng:      needData.lng || null,
        title:        `${needData.category} — ${needData.area}`,
        description:  needData.description || "",
        priority:     needData.urgencyScore >= 8 ? "critical"
                    : needData.urgencyScore >= 5 ? "high" : "medium",
        status:       "assigned",
        matchedCount: matches.length,
        createdAt:    serverTimestamp(),
        createdBy:    user?.uid || "auto",
        autoAssigned: true,
      });

      for (const { volunteer: v, score, distanceKm, breakdown } of matches) {
        const aRef = doc(collection(db, "assignments"));
        batch.set(aRef, {
          volunteerId:    v.id,
          volunteerName:  v.name || v.email || "",
          taskId:         taskRef.id,
          needId,
          needTitle:      needData.category,
          needArea:       needData.area,
          matchScore:     score,
          matchBreakdown: breakdown || {},
          distanceKm,
          status:         "pending",
          assignedAt:     serverTimestamp(),
          assignedBy:     "auto",
        });
        batch.update(doc(db, "users", v.id), {
          tasksTotal: (v.tasksTotal || 0) + 1,
        });
      }

      await batch.commit();

      // OneSignal push to matched volunteers
      const uids = matches.map((m) => m.volunteer.id);
      const urgencyLabel =
        needData.urgencyScore >= 8 ? "🚨 Critical task"
        : needData.urgencyScore >= 5 ? "⚠️ High priority task"
        : "ℹ️ New task";

      await sendPushToVolunteers(
        uids,
        urgencyLabel,
        `${needData.category} in ${needData.area} · Urgency ${needData.urgencyScore}/10 · Tap to respond`,
        { needId, taskId: taskRef.id, type: "new_match" }
      );

      const resultsLog = matches.map((m) => ({
        name: m.volunteer.name || m.volunteer.email,
        score: m.score,
        distanceKm: m.distanceKm,
      }));

      setMatchLog((prev) => prev.map((l) =>
        l.id === logId
          ? { ...l, status: "matched", results: resultsLog, taskId: taskRef.id }
          : l
      ));

      return matches;

    } catch (err) {
      console.error("autoMatch error:", err);
      setMatchLog((prev) => prev.map((l) =>
        l.id === logId ? { ...l, status: "error", error: err.message } : l
      ));
      return [];
    } finally {
      setAutoMatching(false);
    }
  }, [user]);

  // ── Coordinator manually creates a Need (from heatmap page) ─────
  const createNeed = async (data) => {
    if (!user) throw new Error("Not authenticated");

    let lat = data.lat || null;
    let lng = data.lng || null;
    if (!lat || !lng) {
      const known = AREA_COORDINATES[data.area];
      if (known) { lat = known.lat; lng = known.lng; }
      else {
        const geo = await geocodeAddress(data.area);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }
    }

    // autoMatched: false → PIPELINE 1 will pick this up automatically
    await addDoc(collection(db, "needs"), {
      area:         data.area                || "",
      category:     data.category            || "",
      urgencyScore: Number(data.urgencyScore) || 1,
      description:  data.description         || "",
      reportCount:  Number(data.reportCount)  || 1,
      lat, lng,
      status:       "open",
      autoMatched:  false,
      matchedCount: 0,
      createdAt:    serverTimestamp(),
      createdBy:    user.uid,
    });
    // No need to call autoMatch here — the needs useEffect will fire it
  };

  // ── Force re-match a need that got 0 matches ─────────────────────
  const rematchNeed = async (needId) => {
    const need = needsRef.current.find((n) => n.id === needId);
    if (!need) return;

    // Reset autoMatched so PIPELINE 1 picks it up again
    await updateDoc(doc(db, "needs", needId), { autoMatched: false });
    // PIPELINE 1 will fire automatically from the useEffect
  };

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = {
    totalReports:    allReports.length,
    openReports:     allReports.filter((r) => r.status === "open").length,
    criticalReports: allReports.filter((r) => Number(r.urgency) >= 8).length,
    totalNeeds:      needs.length,
    openNeeds:       needs.filter((n) => n.status === "open").length,
    inProgressNeeds: needs.filter((n) => n.status === "in_progress").length,
    resolvedNeeds:   needs.filter((n) => n.status === "resolved").length,
    totalTasks:      tasks.length,
    assignedTasks:   tasks.filter((t) => t.status === "assigned").length,
    inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
    completedTasks:  tasks.filter((t) => t.status === "completed").length,
    totalVolunteers: volunteers.length,
    pendingAssign:   assignments.filter((a) => a.status === "pending").length,
    acceptedAssign:  assignments.filter((a) => a.status === "accepted").length,
    completedAssign: assignments.filter((a) => a.status === "completed").length,
  };

  return (
    <CoordinatorContext.Provider value={{
      allReports, needs, tasks, volunteers, assignments,
      loading, stats, matchLog, autoMatching,
      createNeed, rematchNeed,
    }}>
      {children}
    </CoordinatorContext.Provider>
  );
};

export const useCoordinator = () => useContext(CoordinatorContext);