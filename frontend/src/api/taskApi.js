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

export const getAssignableUsers = ({ search = "", role = "all" } = {}) => {
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  if (role) params.set("role", role);

  return request(`/tasks/assignable-users?${params.toString()}`);
};

export const createTask = (payload) => {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getAdminTasks = ({ status = "all", assignedTo = "all" } = {}) => {
  const params = new URLSearchParams();

  if (status) params.set("status", status);
  if (assignedTo) params.set("assignedTo", assignedTo);

  return request(`/tasks/admin?${params.toString()}`);
};

export const getMyTasks = ({ status = "all" } = {}) => {
  const params = new URLSearchParams();

  if (status) params.set("status", status);

  return request(`/tasks/my?${params.toString()}`);
};

export const getTaskById = (taskId) => {
  return request(`/tasks/${taskId}`);
};

export const updateTask = (taskId, payload) => {
  return request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteTask = (taskId) => {
  return request(`/tasks/${taskId}`, {
    method: "DELETE",
  });
};

export const startTask = (taskId) => {
  return request(`/tasks/${taskId}/start`, {
    method: "PATCH",
  });
};

export const completeTask = (taskId, completionRemark = "") => {
  return request(`/tasks/${taskId}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completionRemark }),
  });
};

export const cancelTask = (taskId) => {
  return request(`/tasks/${taskId}/cancel`, {
    method: "PATCH",
  });
};

export const addTaskNote = (taskId, note) => {
  return request(`/tasks/${taskId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
};