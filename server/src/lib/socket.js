import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { User, Poll, Vote } from "../models/index.js";
import { canAccessGroup } from "./groupAccess.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:5173"],
    credentials: true,
  },
});

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf("=");
        return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
      })
  );

// Authentification des connexions Socket.IO (même cookie JWT que l'API REST)
io.use(async (socket, next) => {
  try {
    const { jwt: token } = parseCookies(socket.handshake.headers.cookie);
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: ["id", "fullName", "role"],
    });
    if (!user) return next(new Error("Unauthorized"));

    socket.data.user = { id: user.id, fullName: user.fullName, role: user.role };
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// Un utilisateur peut rejoindre la room d'un sondage s'il en est le créateur,
// s'il est admin, s'il y a voté, ou si le sondage est clôturé.
export const canJoinPoll = async (user, pollId) => {
  const poll = await Poll.findByPk(pollId, { attributes: ["id", "created_by", "status", "group_id"] });
  if (!poll) return false;
  if (poll.status === "draft") {
    return user.role === "admin" || Number(poll.created_by) === Number(user.id);
  }
  if (user.role === "admin" || Number(poll.created_by) === Number(user.id)) return true;
  // Sondage de groupe : réservé aux membres du groupe
  if (!(await canAccessGroup(user, poll.group_id))) return false;
  if (poll.status === "closed") return true;
  return !!(await Vote.findOne({ where: { poll_id: pollId, user_id: user.id } }));
};

io.on("connection", (socket) => {
  const { user } = socket.data;

  // Room personnelle : notifications ciblées (ex. clôture d'un sondage)
  socket.join(`user-${user.id}`);

  socket.on("join-poll", async (pollId) => {
    try {
      if (!(await canJoinPoll(user, pollId))) {
        socket.emit("socket-error", { message: "Accès à ce sondage refusé" });
        return;
      }
      socket.join(`poll-${pollId}`);
    } catch (error) {
      console.error("join-poll error:", error);
      socket.emit("socket-error", { message: "Erreur de communication en temps réel" });
    }
  });

  socket.on("leave-poll", (pollId) => {
    socket.leave(`poll-${pollId}`);
  });

  socket.on("send-message", (data) => {
    try {
      const { pollId, message } = data || {};
      const text = typeof message === "string" ? message.trim() : "";

      if (!pollId || !text || text.length > 1000) return;
      // Il faut être dans la room pour écrire ; l'identité vient du token, pas du client
      if (!socket.rooms.has(`poll-${pollId}`)) return;

      const now = new Date().toISOString();
      io.to(`poll-${pollId}`).emit("new-message", {
        message: text,
        user_id: user.id,
        fullName: user.fullName,
        created_at: now,
        createdAt: now,
      });
    } catch (error) {
      console.error("Error handling send-message:", error);
    }
  });
});

export { io, app, server };
