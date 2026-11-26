import Chat from "../models/chat.model.js";
import Poll from "../models/polls.model.js";
import User from "../models/user.model.js";
import { canJoinPoll } from "../lib/socket.js";


export const sendMessage = async (req, res) => {
  try {
    const { message, poll_id } = req.body;
    const userId = req.user.id;

    if (typeof message !== "string" || !message.trim() || !poll_id) {
      return res.status(400).json({ message: "Missing data" });
    }
    if (message.length > 1000) {
      return res.status(400).json({ message: "Message trop long (1000 caractères max)" });
    }

    const poll = await Poll.findByPk(poll_id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (poll.category !== "sondage") {
      return res.status(403).json({
        message: "Chat allowed only for sondage polls",
      });
    }

    if (!(await canJoinPoll(req.user, poll_id))) {
      return res.status(403).json({ message: "Accès à ce sondage refusé" });
    }

    const chat = await Chat.create({
      message: message.trim(),
      poll_id,
      user_id: userId,
    });

    const user = await User.findByPk(userId, {
      attributes: ["id", "fullName"],
    });

    const messageData = {
      id: chat.id,
      message: chat.message,
      poll_id: chat.poll_id,
      user_id: chat.user_id,
      fullName: user.fullName,
      created_at: chat.createdAt,
      createdAt: chat.createdAt,
    };

    res.status(201).json(messageData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getMessages = async (req, res) => {
  try {
    const { poll_id } = req.query;

    if (!poll_id) {
      return res.status(400).json({ message: "poll_id required" });
    }

    if (!(await canJoinPoll(req.user, poll_id))) {
      return res.status(403).json({ message: "Accès à ce sondage refusé" });
    }

    const messages = await Chat.findAll({
      where: { poll_id },
      include: [
        {
          model: User,
          attributes: ["id", "fullName"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      message: msg.message,
      poll_id: msg.poll_id,
      user_id: msg.user_id,
      fullName: msg.User?.fullName || "Anonymous",
      created_at: msg.createdAt,
      createdAt: msg.createdAt,
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server error" });
  }
};