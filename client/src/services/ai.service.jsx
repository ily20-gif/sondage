import { axiosInstance } from "../lib/axios";

// messages : [{ role: "user" | "assistant", content: string }]
export const sendAssistantMessage = async (messages) => {
  const res = await axiosInstance.post("/ai/chat", { messages });
  return res.data.reply;
};

// Renvoie { question, options, category, duration_hours, creation_mode }
export const createPollDraftFromChat = async (messages) => {
  const res = await axiosInstance.post("/ai/poll-from-chat", { messages });
  return res.data;
};
