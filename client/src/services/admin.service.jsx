import { axiosInstance } from "../lib/axios";

export const fetchUserPolls = async () => {
  const res = await axiosInstance.get("/poll/owner");
  return res.data.polls || [];
};

export const deletePoll = async (pollId) => {
  const res = await axiosInstance.delete(`/poll/${pollId}`);
  return res.data;
};

export const updatePoll = async (pollId, data) => {
  const res = await axiosInstance.put(`/poll/${pollId}`, data);
  return res.data;
};

export const getPollStats = async (pollId) => {
  const res = await axiosInstance.get(`/poll/${pollId}/stats`);
  return res.data;
};
export const fetchPollResults = async (pollId) => {
  const res = await axiosInstance.get(`/poll/${pollId}/results`);
  return res.data;
};

export const fetchAllPolls = async () => {
  const res = await axiosInstance.get("/poll/admin/all");
  return res.data.polls || [];
};


// ---------- Administration : statistiques, utilisateurs, votes ----------

export const fetchAdminStats = async () => {
  const res = await axiosInstance.get("/admin/stats");
  return res.data;
};

export const fetchAdminUsers = async ({ search = "", role = "", page = 1 } = {}) => {
  const res = await axiosInstance.get("/admin/users", { params: { search, role, page } });
  return res.data;
};

export const setUserRole = async (userId, role) => {
  const res = await axiosInstance.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
};

export const deleteUser = async (userId) => {
  const res = await axiosInstance.delete(`/admin/users/${userId}`);
  return res.data;
};

export const fetchAdminVotes = async ({ search = "", page = 1 } = {}) => {
  const res = await axiosInstance.get("/admin/votes", { params: { search, page } });
  return res.data;
};

export const deleteVote = async (voteId) => {
  const res = await axiosInstance.delete(`/admin/votes/${voteId}`);
  return res.data;
};
