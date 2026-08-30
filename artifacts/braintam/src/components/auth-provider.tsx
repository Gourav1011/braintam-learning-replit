import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "wouter";

export type UserRole = "admin" | "super_admin" | "teacher" | "mentor" | "student";

export interface StudentProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  grade: number;
  effectiveGrade: number;
  role: UserRole;
  school: string | null;
  state: string | null;
  board: string | null;
  points: number;
  rank: number;
  streak: number;
  avatarUrl: string | null;
  isDemoStudent?: boolean;
  studentPortalState?: "none" | "ignite_before_day2" | "ignite_day2_plus" | "completed_ignite" | "mastery";
  igniteMentor?: {
    name: string | null;
    phone: string | null;
  } | null;
}

interface AuthContextType {
  student: StudentProfile | null;
  isLoading: boolean;
  role: UserRole | null;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_BASE as BASE } from "@/lib/api-base";
export const STAFF_TOKEN_KEY = "braintam_staff_token";
export const STUDENT_TOKEN_KEY = "braintam_student_token";

async function fetchProfileWithToken(token: string): Promise<StudentProfile | null> {
  try {
    const r = await fetch(`${BASE}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function isStaffPath(path: string) {
  // /live is shared by teacher/mentor/admin/student — staff-ness there is determined
  // by which token is present (staffToken vs studentToken), not by path prefix alone,
  // so it must NOT be excluded here or a staff member's real profile never resolves
  // on the live-classroom page (falls back to a fake/anonymous identity instead).
  return path.startsWith("/admin") || path.startsWith("/teacher") || path.startsWith("/mentor") || path.startsWith("/workplace") || path.startsWith("/live");
}

function normalize(s: StudentProfile): StudentProfile {
  return { ...s, streak: (s as any).streak ?? 0, role: (s.role as UserRole) ?? "student" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);
  const [authVersion, setAuthVersion] = useState(0);

  // Track last resolved identity so we don't re-fetch on every navigation.
  // Include a timestamp so we force a re-fetch every 3 minutes even if nothing else changed.
  const lastResolvedRef = useRef<{ staffToken: string | null; studentToken: string | null; at: number } | null>(null);
  const PROFILE_TTL_MS = 0; // caching disabled — always fetch fresh profile

  useEffect(() => {
    const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
    const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);

    const now = Date.now();
    const profileFresh = lastResolvedRef.current
      ? (now - lastResolvedRef.current.at) < PROFILE_TTL_MS
      : false;

    // ── Staff paths: always use the staff token exclusively ──────────────
    if (isStaffPath(location) && staffToken) {
      // Skip re-fetch if nothing changed AND profile is still fresh
      if (
        profileFresh &&
        lastResolvedRef.current?.staffToken === staffToken &&
        student !== null
      ) return;

      setStudentLoading(true);
      fetchProfileWithToken(staffToken)
        .then((data) => {
          if (data) {
            setStudent(normalize(data));
            lastResolvedRef.current = { staffToken, studentToken: null, at: Date.now() };
          } else {
            localStorage.removeItem(STAFF_TOKEN_KEY);
            setStudent(null);
            lastResolvedRef.current = null;
          }
        })
        .finally(() => setStudentLoading(false));
      return;
    }

    // ── Student paths ─────────────────────────────────────────────────────
    // If a staff token exists on a student page, block the student view.
    // The admin must log out of the admin portal first.
    if (staffToken && !isStaffPath(location)) {
      setStudent(null);
      setStudentLoading(false);
      return;
    }

    if (studentToken) {
      const identityUnchanged =
        lastResolvedRef.current?.studentToken === studentToken;

      // Same identity + student already loaded:
      // • Within TTL → skip entirely (no request).
      // • TTL expired → silent background refresh (no spinner, no blink).
      if (identityUnchanged && student !== null) {
        if (profileFresh) return;
        // Refresh silently — do NOT call setStudentLoading so the UI never flickers.
        fetchProfileWithToken(studentToken).then((data) => {
          if (data) {
            setStudent(normalize(data));
            lastResolvedRef.current = { staffToken: null, studentToken, at: Date.now() };
          } else {
            localStorage.removeItem(STUDENT_TOKEN_KEY);
            window.dispatchEvent(new CustomEvent("braintam:auth_change"));
            setStudent(null);
            setStudentLoading(false);
            lastResolvedRef.current = null;
          }
        });
        return;
      }

      // New identity or no student yet — show spinner for the full fetch.
      setStudentLoading(true);
      fetchProfileWithToken(studentToken)
        .then((data) => {
          if (data) {
            setStudent(normalize(data));
            lastResolvedRef.current = { staffToken: null, studentToken, at: Date.now() };
          } else {
            localStorage.removeItem(STUDENT_TOKEN_KEY);
            window.dispatchEvent(new CustomEvent("braintam:auth_change"));
            setStudent(null);
            lastResolvedRef.current = null;
          }
        })
        .finally(() => setStudentLoading(false));
      return;
    }

    setStudent(null);
    setStudentLoading(false);
    lastResolvedRef.current = {
      staffToken: null,
      studentToken: null,
      at: Date.now(),
    };
  }, [authVersion, location]);

  useEffect(() => {
    function refreshFromTokenChange() {
      lastResolvedRef.current = null;
      setStudentLoading(true);
      setAuthVersion(version => version + 1);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STAFF_TOKEN_KEY || event.key === STUDENT_TOKEN_KEY) {
        refreshFromTokenChange();
      }
    }

    window.addEventListener("braintam:auth_change", refreshFromTokenChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("braintam:auth_change", refreshFromTokenChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const logout = () => {
    setStudentLoading(true);
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    window.dispatchEvent(new CustomEvent("braintam:auth_change"));
    lastResolvedRef.current = null;
    setStudent(null);
    setStudentLoading(false);
  };

  const refreshAuth = () => {
    setStudentLoading(true);
    lastResolvedRef.current = null;
    const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
    const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);
    const onStaff = isStaffPath(location);
    const token = (onStaff && staffToken) ? staffToken : (studentToken || null);
    if (token) {
      fetchProfileWithToken(token)
        .then((data) => {
          if (data) {
            setStudent(normalize(data));
          } else {
            setStudent(null);
          }
        })
        .finally(() => setStudentLoading(false));
    } else {
      setStudent(null);
      setStudentLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      student,
      isLoading: studentLoading,
      role: student?.role ?? null,
      logout,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
