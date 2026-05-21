import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StudentProfile } from "@workspace/api-client-react";

const TOKEN_KEY = "braintam_token";
const STUDENT_KEY = "braintam_student";

interface AuthContextValue {
  token: string | null;
  student: StudentProfile | null;
  isLoaded: boolean;
  login: (token: string, student: StudentProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateStudent: (student: StudentProfile) => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  student: null,
  isLoaded: false,
  login: async () => {},
  logout: async () => {},
  updateStudent: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(STUDENT_KEY),
        ]);
        if (t) setToken(t);
        if (s) {
          try { setStudent(JSON.parse(s)); } catch {}
        }
      } catch {}
      setIsLoaded(true);
    })();
  }, []);

  const login = async (t: string, s: StudentProfile) => {
    await AsyncStorage.setItem(TOKEN_KEY, t);
    await AsyncStorage.setItem(STUDENT_KEY, JSON.stringify(s));
    setToken(t);
    setStudent(s);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, STUDENT_KEY]);
    setToken(null);
    setStudent(null);
  };

  const updateStudent = (s: StudentProfile) => {
    setStudent(s);
    AsyncStorage.setItem(STUDENT_KEY, JSON.stringify(s)).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ token, student, isLoaded, login, logout, updateStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
