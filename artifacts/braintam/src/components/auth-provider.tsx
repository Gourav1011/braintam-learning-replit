import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";

export interface StudentProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  grade: number;
  school: string | null;
  points: number;
  rank: number;
  streak: number;
  avatarUrl: string | null;
}

interface AuthContextType {
  student: StudentProfile | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setStudent(null);
      return;
    }
    setStudentLoading(true);
    fetch(`${BASE}/api/student/profile`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StudentProfile | null) => {
        if (data) {
          setStudent(data);
        } else {
          setStudent({
            id: 1,
            name: user.fullName ?? user.firstName ?? "Student",
            email: user.emailAddresses[0]?.emailAddress ?? null,
            phone: null,
            grade: 6,
            school: null,
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
    signOut();
  };

  return (
    <AuthContext.Provider value={{ student, isLoading: !isLoaded || studentLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
