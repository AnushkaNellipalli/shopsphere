import { createContext, useContext, useEffect, useState } from "react";
import { getMe, getToken, loginUser, logoutUser, registerUser, setToken } from "../services/api";

const AuthContext = createContext();

// Keeps "who is logged in" in one place so every component can read it.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken()); // true while we check a saved token

  // When the page loads, if we have a saved token, ask Django who it belongs to.
  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then(setUser)
      .catch(() => setToken(null)) // token expired or invalid
      .finally(() => setLoading(false));
  }, []);

  async function login(form) {
    const data = await loginUser(form);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(form) {
    const data = await registerUser(form);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    try { await logoutUser(); } catch { /* even if the call fails, log out locally */ }
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
