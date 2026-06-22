import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getMe,
  googleLoginUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../api/authApi";

const AuthContext = createContext(null);

const getInitialToken = () => localStorage.getItem("token") || "";

const getStoredUser = () => {
  const token = getInitialToken();

  if (!token) return null;

  try {
    const value = localStorage.getItem("user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(Boolean(getInitialToken()));

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  }, []);

  const saveAuth = useCallback((data) => {
    if (!data?.token || !data?.user) {
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = async ({ email, password }) => {
    const data = await loginUser({ email, password });
    saveAuth(data);
    return data;
  };

  const register = async (payload) => {
    const data = await registerUser(payload);

    if (!data.pendingApproval) {
      saveAuth(data);
    }

    return data;
  };

  const loginWithGoogle = async (credential) => {
    const data = await googleLoginUser(credential);

    if (!data.pendingApproval) {
      saveAuth(data);
    }

    return data;
  };

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) {
      clearAuth();
      setLoading(false);
      return;
    }

    try {
      const data = await getMe();

      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout API error
    }

    clearAuth();
  };

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      loginWithGoogle,
      refreshUser,
      logout,
    }),
    [user, token, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};