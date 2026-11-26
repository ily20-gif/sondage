import { axiosInstance } from "../lib/axios";

export const fetchGroups = async () => {
  const res = await axiosInstance.get("/groups");
  return res.data;
};

export const createGroup = async ({ name, parent_id }) => {
  const res = await axiosInstance.post("/groups", { name, parent_id: parent_id ?? null });
  return res.data;
};

export const deleteGroup = async (id) => {
  const res = await axiosInstance.delete(`/groups/${id}`);
  return res.data;
};

export const joinGroup = async (id) => {
  const res = await axiosInstance.post(`/groups/${id}/join`);
  return res.data;
};

export const leaveGroup = async (id) => {
  const res = await axiosInstance.delete(`/groups/${id}/leave`);
  return res.data;
};

// Admin : demandes d'adhésion en attente
export const fetchRequests = async () => {
  const res = await axiosInstance.get("/groups/requests");
  return res.data;
};

export const approveRequest = async (id) => {
  const res = await axiosInstance.post(`/groups/requests/${id}/approve`);
  return res.data;
};

export const rejectRequest = async (id) => {
  const res = await axiosInstance.delete(`/groups/requests/${id}`);
  return res.data;
};

// Admin : membres d'un groupe
export const fetchMembers = async (groupId) => {
  const res = await axiosInstance.get(`/groups/${groupId}/members`);
  return res.data;
};

export const removeMember = async (groupId, userId) => {
  const res = await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
  return res.data;
};
