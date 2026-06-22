import API from "./axios";

export const loginUser = async (payload) => {
  const response = await API.post("/auth/login", payload);
  return response.data;
};

export const registerUser = async (payload) => {
  const response = await API.post("/auth/register", payload);
  return response.data;
};

export const googleLoginUser = async (credential) => {
  const response = await API.post("/auth/google", {
    credential,
  });

  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await API.post("/auth/forgot-password", {
    email,
  });

  return response.data;
};

export const resetPassword = async ({ token, password, confirmPassword }) => {
  const response = await API.post(`/auth/reset-password/${token}`, {
    password,
    confirmPassword,
  });

  return response.data;
};

export const getMe = async () => {
  const response = await API.get("/auth/me");
  return response.data;
};

export const logoutUser = async () => {
  const response = await API.post("/auth/logout");
  return response.data;
};