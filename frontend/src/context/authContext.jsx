import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const API_BASE = "http://localhost:3000/api";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [children_list, setChildrenList] = useState([]);
  const [activeChild, setActiveChildState] = useState(null);

  // ── FETCH SEMUA ANAK ──────────────────────────────────────────────────────
  const fetchChildren = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/children`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setChildrenList(list);

      // Tentukan activeChild: pakai savedId kalau masih valid, fallback ke index 0
      const savedId = localStorage.getItem("activeChildId");
      const found = list.find((c) => c.id === savedId);
      const active = found || list[0] || null;
      setActiveChildState(active);
      if (active) localStorage.setItem("activeChildId", active.id);
    } catch (err) {
      console.error("Gagal fetch children:", err);
    }
  }, []);

  // Fetch saat user login
  useEffect(() => {
    if (user) fetchChildren();
    else {
      setChildrenList([]);
      setActiveChildState(null);
    }
  }, [user, fetchChildren]);

  // ── SWITCH ANAK AKTIF ─────────────────────────────────────────────────────
  const setActiveChild = useCallback(
    (childId) => {
      const found = children_list.find((c) => c.id === childId);
      if (!found) return;
      setActiveChildState(found);
      localStorage.setItem("activeChildId", childId);
    },
    [children_list],
  );

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeChildId");
    setUser(null);
    setChildrenList([]);
    setActiveChildState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        activeChild, // objek anak yang aktif — langsung pakai ini
        setActiveChild, // fungsi switch: setActiveChild(childId)
        children_list, // semua anak milik user
        fetchChildren, // panggil setelah tambah anak baru
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
