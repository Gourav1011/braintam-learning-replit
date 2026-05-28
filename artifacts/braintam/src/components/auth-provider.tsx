import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";

export type UserRole = "admin" | "teacher" | "student";

export interface StudentProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  grade: number;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
    const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);

    // ── Staff paths: always use the staff token exclusively ──────────────
    if (isStaffPath(location) && staffToken) {
      fetchProfileWithToken(staffToken)
        .then((data) => {
          if (data) {
            setStudent({ ...data, streak: (data as any).streak ?? 0, role: (data.role as UserRole) ?? "student" });
          } else {
            localStorage.removeItem(STAFF_TOKEN_KEY);
            setStudent(null);
          }
        })
        .finally(() => setStudentLoading(false));
      return;
    }

    // ── Student paths ─────────────────────────────────────────────────────
    // If a staff token exists, do NOT auto-sync Clerk. The admin must log
    // out from the admin portal before using the student portal, otherwise
    // the admin's Clerk session would silently create a student record.
    if (staffToken && !isStaffPath(location)) {
      setStudent(null);
      setStudentLoading(false);
      return;
    }

    if (studentToken) {
      fetchProfileWithToken(studentToken)
        .then((data) => {
          if (data) {
            setStudent({ ...data, streak: (data as any).streak ?? 0, role: (data.role as UserRole) ?? "student" });
          } else {
            localStorage.removeItem(STUDENT_TOKEN_KEY);
            setStudent(null);
          }
        })
        .finally(() => setStudentLoading(false));
      return;
    }

    if (!user) {
      setStudent(null);
      setStudentLoading(false);
      return;
    }

    // Clerk user — sync with DB to get a real token so all API calls work.
    // Clear any lingering staff token so sessions don't cross-contaminate.
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    const name = user.fullName ?? user.firstName ?? "Student";

    if (!email) {
      setStudent(null);
      setStudentLoading(false);
      return;
    }

    syncClerkUser(email, name)
      .then((result) => {
        if (result) {
          localStorage.removeItem(STAFF_TOKEN_KEY);
          localStorage.setItem(STUDENT_TOKEN_KEY, result.token);
          setStudent({ ...result.student, streak: (result.student as any).streak ?? 0, role: (result.student.role as UserRole) ?? "student" });
        } else {
          setStudent(null);
        }
      })
      .finally(() => setStudentLoading(false));
  }, [isLoaded, user, location]);

  const logout = () => {
    setStudentLoading(true);
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    setStudent(null);
    if (user) {
      signOut();
    }
    setStudentLoading(false);
  };

  const refreshAuth = () => {
    setStudentLoading(true);
    const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
    const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);
    const onStaff = isStaffPath(location);
    const token = (onStaff && staffToken) ? staffToken : (studentToken || null);
    if (token) {
      fetchProfileWithToken(token)
        .then((data) => {
          if (data) {
            setStudent({ ...data, streak: (data as any).streak ?? 0, role: (data.role as UserRole) ?? "student" });
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
