import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

<<<<<<< HEAD
// Hook custom biar gampang dipanggil: const { user } = useAuth()
=======
>>>>>>> 0ea794a968e2d2b45a3c75475be6110e030c8741
export function useAuth() {
  return useContext(AuthContext);
}
