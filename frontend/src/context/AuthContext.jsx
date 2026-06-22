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

const getStoredUser = () => {
  try {
    const value = localStorage.getItem("user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  const saveAuth = useCallback((data) => {
    if (data?.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }

    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    }
  }, []);

  const login = async ({ email, password }) => {
    const data = await loginUser({ email, password });
    saveAuth(data);
    return data;
  };

  const register = async (payload) => {
    const data = await registerUser(payload);
    saveAuth(data);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const data = await googleLoginUser(credential);
    saveAuth(data);
    return data;
  };

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("token")) {
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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken("");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore backend logout error
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
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