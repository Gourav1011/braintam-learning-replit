import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";

export type UserRole = "admin" | "teacher" | "student";

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
}

interface AuthContextType {
  student: StudentProfile | null;
  isLoading: boolean;
  role: UserRole | null;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
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

async function syncClerkUser(email: string, name: string): Promise<{ token: string; student: StudentProfile } | null> {
  try {
    const r = await fetch(`${BASE}/api/auth/clerk-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function isStaffPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/teacher");
}

function normalize(s: StudentProfile): StudentProfile {
  return { ...s, streak: (s as any).streak ?? 0, role: (s.role as UserRole) ?? "student" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);

  // Track last resolved identity so we don't re-fetch on every navigation.
  // Include a timestamp so we force a re-fetch every 3 minutes even if nothing else changed.
  const lastResolvedRef = useRef<{ userId: string | null; staffToken: string | null; studentToken: string | null; at: number } | null>(null);
  const PROFILE_TTL_MS = 3 * 60 * 1000; // re-fetch profile every 3 minutes

  useEffect(() => {
    if (!isLoaded) return;

    const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
    const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);
    const clerkUserId = user?.id ?? null;

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
        lastResolvedRef.current?.userId === clerkUserId &&
        student !== null
      ) return;

      setStudentLoading(true);
      fetchProfileWithToken(staffToken)
        .then((data) => {
          if (data) {
            setStudent(normalize(data));
            lastResolvedRef.current = { userId: clerkUserId, staffToken, studentToken: null, at: Date.now() };
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
      // Skip re-fetch if same token + same Clerk user, profile is loaded, and still fresh
      if (
        profileFresh &&
        lastResolvedRef.current?.studentToken === studentToken &&
        lastResolvedRef.current?.userId === clerkUserId &&
        student !== null
      ) return;

      setStudentLoading(true);
      fetchProfileWithToken(studentToken)
        .then((data) => {
          if (data) {
            setStudent(normalize(data));
            lastResolvedRef.current = { userId: clerkUserId, staffToken: null, studentToken, at: Date.now() };
          } else {
            localStorage.removeItem(STUDENT_TOKEN_KEY);
            setStudent(null);
            lastResolvedRef.current = null;
          }
        })
        .finally(() => setStudentLoading(false));
      return;
    }

    if (!user) {
      setStudent(null);
      setStudentLoading(false);
      lastResolvedRef.current = { userId: null, staffToken: null, studentToken: null, at: Date.now() };
      return;
    }

    // Clerk user present but no token yet — sync with DB to get a real token.
    // IMPORTANT: set loading BEFORE the async call so ProtectedRoute shows a
    // loading screen instead of redirecting to /sign-in while sync is in flight.
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    const name = user.fullName ?? user.firstName ?? "Student";

    if (!email) {
      setStudent(null);
      setStudentLoading(false);
      return;
    }

    setStudentLoading(true);
    syncClerkUser(email, name)
      .then((result) => {
        if (result) {
          localStorage.removeItem(STAFF_TOKEN_KEY);
          localStorage.setItem(STUDENT_TOKEN_KEY, result.token);
          setStudent(normalize(result.student));
          lastResolvedRef.current = { userId: clerkUserId, staffToken: null, studentToken: result.token, at: Date.now() };
        } else {
          setStudent(null);
          lastResolvedRef.current = null;
        }
      })
      .finally(() => setStudentLoading(false));
  }, [isLoaded, user, location]);

  const logout = () => {
    setStudentLoading(true);
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    lastResolvedRef.current = null;
    setStudent(null);
    if (user) {
      signOut();
    }
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
      isLoading: !isLoaded || studentLoading,
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
