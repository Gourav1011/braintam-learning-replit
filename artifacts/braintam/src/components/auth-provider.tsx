import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const STAFF_TOKEN_KEY = "braintam_staff_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);

    if (staffToken) {
      setStudentLoading(true);
      fetch(`${BASE}/api/student/profile`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      })
        .then(r => (r.ok ? r.json() : null))
        .then((data: StudentProfile | null) => {
          if (data) {
            setStudent({ ...data, role: (data.role as UserRole) ?? "student" });
          } else {
            localStorage.removeItem(STAFF_TOKEN_KEY);
            setStudent(null);
          }
        })
        .catch(() => {
          localStorage.removeItem(STAFF_TOKEN_KEY);
          setStudent(null);
        })
        .finally(() => setStudentLoading(false));
      return;
    }

    if (!user) {
      setStudent(null);
      return;
    }

    setStudentLoading(true);
    fetch(`${BASE}/api/student/profile`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then((data: StudentProfile | null) => {
        if (data) {
          setStudent({ ...data, role: (data.role as UserRole) ?? "student" });
        } else {
          setStudent({
            id: 0,
            name: user.fullName ?? user.firstName ?? "Student",
            email: user.emailAddresses[0]?.emailAddress ?? null,
            phone: null,
            grade: 6,
            role: "student",
            school: null,
            state: null,
            board: null,
            points: 0,
            rank: 1,
            streak: 0,
            avatarUrl: user.imageUrl ?? null,
          });
        }
      })
      .catch(() => setStudent(null))
      .finally(() => setStudentLoading(false));
  }, [isLoaded, user]);

  const logout = () => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    setStudent(null);
    signOut();
  };

  return (
    <AuthContext.Provider value={{
      student,
      isLoading: !isLoaded || studentLoading,
      role: student?.role ?? null,
      logout,
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
