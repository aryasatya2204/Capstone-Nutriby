import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // === PERBAIKAN: Baca localStorage saat inisialisasi awal ===
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user"); // Baca data user yang disimpan

    // Jika ada token dan data user, parse JSON-nya dan kembalikan sebagai state
    if (token && storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("Gagal membaca data user", error);
        return null;
      }
    }
    return null;
  });

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token"); // Hapus token
    localStorage.removeItem("user"); // Hapus data user juga
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
