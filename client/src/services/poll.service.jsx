import { axiosInstance } from "../lib/axios";

export const fetchPolls = async () => {
  const res = await axiosInstance.get("/poll");
  return res.data;
};

export const fetchPollById = async (id) => {
  const res = await axiosInstance.get(`/poll/${id}`);
  return res.data;
};

export const updatePoll = async (id, data) => {
  const res = await axiosInstance.put(`/poll/${id}`, data);
  return res.data;
};

export const submitVote = async (poll_id, option_selected) => {
  const res = await axiosInstance.post("/vote", { poll_id, option_selected });
  return res.data;
};

export const createPoll = async ({ question, options, category, end_time, creation_mode, group_id }) => {
  const res = await axiosInstance.post("/poll", {
    question,
    options,
    category,
    end_time,
    creation_mode,
    group_id: group_id || null,
  });
  return res.data;
};

export const fetchChatMessages = async (poll_id) => {
  const res = await axiosInstance.get(`/chat?poll_id=${poll_id}`, { withCredentials: true });
  return res.data;
};

export const sendChatMessage = async (poll_id, message) => {
  const res = await axiosInstance.post(
    "/chat",
    { poll_id, message },
    { withCredentials: true }
  );
  return res.data;
};

export const setPollStatus = async (id, status) => {
  const res = await axiosInstance.patch(`/poll/${id}/status`, { status });
  return res.data;
};

// Génération IA (appel fait par le serveur, la clé API n'est jamais exposée)
export const generatePollWithAI = async ({ theme, count }) => {
  const res = await axiosInstance.post("/poll/generate", { theme, count });
  return res.data;
};

// Suggestions de thèmes avec l'IA
export const suggestThemesWithAI = async ({ category }) => {
  const res = await axiosInstance.post("/poll/suggest-themes", {
    category,
  });

  return res.data;
};