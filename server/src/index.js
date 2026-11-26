import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";



dotenv.config();

import AuthRoutes from "./routes/auth.route.js";
import PollRoutes from "./routes/poll.route.js";
import UserRoutes from "./routes/user.route.js";
import VoteRoutes from "./routes/vote.route.js";
import ChatRoutes from "./routes/chat.route.js";
import NotifRoutes from "./routes/notification.route.js"
import GroupRoutes from "./routes/group.route.js";
import AdminRoutes from "./routes/admin.route.js";
import AiRoutes from "./routes/ai.route.js";
import { connectDB } from "./lib/sequelize.js";
import { app, server } from "./lib/socket.js";
import "./cron/pollResultsCron.js";


const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173'], 
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

app.use('/api/auth', AuthRoutes);
app.use('/api/poll', PollRoutes);
app.use('/api/user', UserRoutes);
app.use('/api/vote', VoteRoutes);
app.use('/api/chat', ChatRoutes);
app.use('/api/notifications', NotifRoutes);
app.use('/api/groups', GroupRoutes);
app.use('/api/admin', AdminRoutes);
app.use('/api/ai', AiRoutes);

if (process.env.NODE_ENV !== "development") {
  const staticPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(staticPath));

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

server.listen(PORT, "0.0.0.0", () => {
  connectDB();
  console.log(`Server running on port ${PORT}`);
});
