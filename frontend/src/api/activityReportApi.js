import API from "./axios";

export const getActivityReport = async ({ type, date, search, role }) => {
  const response = await API.get("/activity-reports/summary", {
    params: {
      type,
      date,
      search,
      role,
    },
  });

  return response.data;
};

export const getActivityReportSettings = async () => {
  const response = await API.get("/activity-reports/settings");
  return response.data;
};

export const updateActivityReportSettings = async (payload) => {
  const response = await API.put("/activity-reports/settings", payload);
  return response.data;
};