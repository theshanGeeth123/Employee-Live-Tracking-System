const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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

export const getMeetingInviteUsers = ({ search = "", role = "all" } = {}) => {
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  if (role) params.set("role", role);

  const query = params.toString();

  return request(`/meetings/invite-users${query ? `?${query}` : ""}`);
};

export const createMeeting = (payload) => {
  return request("/meetings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getActiveMeeting = () => {
  return request("/meetings/active");
};

export const getAdminMeetings = ({ date, status = "all" } = {}) => {
  const params = new URLSearchParams();

  if (date) params.set("date", date);
  if (status) params.set("status", status);

  const query = params.toString();

  return request(`/meetings/admin${query ? `?${query}` : ""}`);
};

export const getMeetingById = (meetingId) => {
  return request(`/meetings/${meetingId}`);
};

export const startMeeting = (meetingId) => {
  return request(`/meetings/${meetingId}/start`, {
    method: "PATCH",
  });
};

export const endMeeting = (meetingId) => {
  return request(`/meetings/${meetingId}/end`, {
    method: "PATCH",
  });
};

export const joinMeeting = (meetingId) => {
  return request(`/meetings/${meetingId}/join`, {
    method: "POST",
  });
};