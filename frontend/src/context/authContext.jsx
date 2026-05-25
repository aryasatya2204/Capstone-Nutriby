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

  // ambil data semua anak
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

      // set anak yang aktif
      const savedId = localStorage.getItem("activeChildId");
      const found = list.find((c) => c.id === savedId);
      const active = found || list[0] || null;
      setActiveChildState(active);
      if (active) localStorage.setItem("activeChildId", active.id);
    } catch (err) {
      console.error("Gagal fetch children:", err);
    }
  }, []);

  // ambil data anak pas login
  useEffect(() => {
    if (user) fetchChildren();
    else {
      setChildrenList([]);
      setActiveChildState(null);
    }
  }, [user, fetchChildren]);

  // ganti anak yang aktif
  const setActiveChild = useCallback(
    (childId) => {
      const found = children_list.find((c) => c.id === childId);
      if (!found) return;
      setActiveChildState(found);
      localStorage.setItem("activeChildId", childId);
    },
    [children_list],
  );

  // fungsi auth login logout
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
        activeChild,
        setActiveChild,
        children_list,
        fetchChildren,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
