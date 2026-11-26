import { Op } from "sequelize";
import { Poll, PollOption, Vote } from "../models/index.js";
import { io } from "./socket.js";
import { calculatePollResults } from "../utils/pollResults.js";

// Clôture (côté serveur) les sondages publiés dont la date de fin est dépassée
// puis notifie en temps réel le créateur et les votants via Socket.IO.
export const closeExpiredPolls = async () => {
  const expired = await Poll.findAll({
    where: { status: "published", end_time: { [Op.lte]: new Date() } },
    include: [
      { model: PollOption, attributes: ["id", "option_text"] },
      {
        model: Vote,
        attributes: ["option_id", "user_id"],
        include: [{ model: PollOption, attributes: ["id", "option_text"] }],
      },
    ],
  });
  if (!expired.length) return 0;

  await Poll.update(
    { status: "closed" },
    { where: { id: expired.map((p) => p.id), status: "published" } }
  );

  for (const poll of expired) {
    const closed = poll.toJSON();
    closed.status = "closed";
    const { votesCount, counts, winner } = calculatePollResults(closed, closed.Votes);

    const payload = {
      pollId: poll.id,
      question: poll.question,
      category: poll.category,
      totalVotes: closed.Votes.length,
      votesCount,
      counts,
      winner,
    };

    // Room du sondage (utilisateurs présents sur la page)
    io.to(`poll-${poll.id}`).emit("poll-closed", payload);

    // Rooms personnelles : créateur + votants, même s'ils sont ailleurs dans l'appli
    const userIds = new Set([Number(poll.created_by), ...closed.Votes.map((v) => Number(v.user_id))]);
    for (const uid of userIds) io.to(`user-${uid}`).emit("poll-closed", payload);
  }

  return expired.length;
};
