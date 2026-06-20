const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getToken = () => {
  const user =
    safeJsonParse(localStorage.getItem("user")) ||
    safeJsonParse(localStorage.getItem("authUser")) ||
    safeJsonParse(localStorage.getItem("auth"));

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    user?.token ||
    user?.accessToken ||
    ""
  );
};

const request = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

export const getAttendanceSettings = () => {
  return request("/attendance-advanced/settings");
};

export const updateAttendanceSettings = (payload) => {
  return request("/attendance-advanced/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const getAdvancedAttendanceReport = ({
  type = "daily",
  date,
  search = "",
  role = "all",
} = {}) => {
  const params = new URLSearchParams();

  params.set("type", type);

  if (date) params.set("date", date);
  if (search) params.set("search", search);
  if (role) params.set("role", role);

  return request(`/attendance-advanced/report?${params.toString()}`);
};