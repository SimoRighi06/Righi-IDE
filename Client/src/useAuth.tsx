import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

interface User { id: string; name: string; email: string }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: "google" | "github", code: string) => Promise<void>; // <-- Aggiunto
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("righi_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get(`${API}/auth/me`)
        .then(r => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const save = (token: string, user: User) => {
    localStorage.setItem("righi_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    save(data.token, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, password });
    save(data.token, data.user);
  };

  // ─── NUOVA FUNZIONE PER OAUTH ──────────────────────────────────────────────
  const loginWithProvider = async (provider: "google" | "github", code: string) => {
    const { data } = await axios.post(`${API}/auth/${provider}`, { code });
    save(data.token, data.user);
  };

  const logout = () => {
    localStorage.removeItem("righi_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithProvider, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};