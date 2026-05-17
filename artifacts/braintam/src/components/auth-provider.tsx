import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { StudentProfile } from "@workspace/api-client-react";

interface AuthContextType {
  student: StudentProfile | null;
  token: string | null;
  login: (token: string, student: StudentProfile) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("braintam_token");
    const storedStudent = localStorage.getItem("braintam_student");
    if (storedToken && storedStudent) {
      setToken(storedToken);
      try {
        setStudent(JSON.parse(storedStudent));
      } catch (e) {
        // ignore
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newStudent: StudentProfile) => {
    localStorage.setItem("braintam_token", newToken);
    localStorage.setItem("braintam_student", JSON.stringify(newStudent));
    setToken(newToken);
    setStudent(newStudent);
  };

  const logout = () => {
    localStorage.removeItem("braintam_token");
    localStorage.removeItem("braintam_student");
    setToken(null);
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{ student, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
