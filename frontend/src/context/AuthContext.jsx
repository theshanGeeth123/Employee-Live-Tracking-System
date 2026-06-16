import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

const getSavedUser = () => {
  try {
    const savedUser = localStorage.getItem("user");

    if (!savedUser || savedUser === "undefined" || savedUser === "null") {
      localStorage.removeItem("user");
      return null;
    }

    return JSON.parse(savedUser);
  } catch (error) {
    localStorage.removeItem("user");
    return null;
  }
};

const getSavedToken = () => {
  const savedToken = localStorage.getItem("token");

  if (!savedToken || savedToken === "undefined" || savedToken === "null") {
    localStorage.removeItem("token");
    return null;
  }

  return savedToken;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getSavedUser());
  const [token, setToken] = useState(() => getSavedToken());
  const [loading, setLoading] = useState(true);

  const saveAuthData = (newToken, newUser) => {
    if (!newToken || !newUser) {
      throw new Error("Invalid login response");
    }

    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  };

  const login = async ({ email, password }) => {
    const response = await API.post("/auth/login", {
      email,
      password,
    });

    const responseToken = response.data.token;
    const responseUser = response.data.user;

    saveAuthData(responseToken, responseUser);

    return responseUser;
  };

  const register = async (formData) => {
    const response = await API.post("/auth/register", formData);

    const responseToken = response.data.token;
    const responseUser = response.data.user;

    saveAuthData(responseToken, responseUser);

    return responseUser;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (error) {
      console.log("Logout API failed:", error.message);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  const fetchMe = async () => {
    try {
      const savedToken = getSavedToken();

      if (!savedToken) {
        setLoading(false);
        return;
      }

      const response = await API.get("/auth/me");

      if (!response.data.user) {
        throw new Error("Invalid user response");
      }

      setUser(response.data.user);
      setToken(savedToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(user && token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};