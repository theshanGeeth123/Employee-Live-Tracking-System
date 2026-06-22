import API from "./axios";

export const getAdminUsers = async ({ status = "all", role = "all", search = "" }) => {
  const response = await API.get("/admin/user-control", {
    params: {
      status,
      role,
      search,
    },
  });

  return response.data;
};

export const getAdminUserDetails = async (userId) => {
  const response = await API.get(`/admin/user-control/${userId}`);
  return response.data;
};

export const approveAdminUser = async (userId, payload) => {
  const response = await API.patch(`/admin/user-control/${userId}/approve`, payload);
  return response.data;
};

export const updateAdminUserRolePosition = async (userId, payload) => {
  const response = await API.patch(
    `/admin/user-control/${userId}/update-role-position`,
    payload
  );

  return response.data;
};

export const changeAdminUserStatus = async (userId, accountStatus) => {
  const response = await API.patch(`/admin/user-control/${userId}/status`, {
    accountStatus,
  });

  return response.data;
};

export const removeAdminUser = async (userId) => {
  const response = await API.delete(`/admin/user-control/${userId}`);
  return response.data;
};