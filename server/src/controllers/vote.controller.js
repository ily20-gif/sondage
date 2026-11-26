import { Poll, PollOption, Vote } from "../models/index.js";
import { io } from "../lib/socket.js";
import { calculatePollResults, loadVotes } from "../utils/pollResults.js";
import { canAccessGroup } from "../lib/groupAccess.js";

export const votePoll = async (req, res) => {
  try {
    const { poll_id, option_selected } = req.body;
    const user_id = req.user.id;

    // 1. Validation de la requête
    if (!poll_id || !option_selected || typeof option_selected !== "string") {
      return res.status(400).json({ message: "Le sondage et la proposition sont obligatoires" });
    }

    // 2. Sondage + propositions
    const poll = await Poll.findByPk(poll_id, {
      include: [{ model: PollOption, attributes: ["id", "option_text"] }],
    });
    if (!poll) return res.status(404).json({ message: "Sondage introuvable" });

    // 2b. Sondage de groupe : réservé aux membres du groupe (ou de ses sous-groupes)
    if (!(await canAccessGroup(req.user, poll.group_id))) {
      return res.status(403).json({ message: "Ce sondage est réservé aux membres du groupe" });
    }

    // 3. Le sondage doit être publié et encore ouvert (vérification côté serveur)
    if (poll.status !== "published" || new Date(poll.end_time) <= new Date()) {
      return res.status(403).json({ message: "Le vote est fermé ou le sondage n'est pas publié" });
    }

    // 4. La proposition doit appartenir à ce sondage
    const option = poll.PollOptions.find((o) => o.option_text === option_selected);
    if (!option) return res.status(400).json({ message: "Proposition invalide" });

    // 5. Le créateur ne vote pas sur son propre sondage
    if (Number(user_id) === Number(poll.created_by)) {
      return res.status(403).json({ message: "Vous ne pouvez pas voter sur votre propre sondage" });
    }

    // 6. Un seul vote par utilisateur et par sondage
    const alreadyVoted = await Vote.findOne({ where: { poll_id, user_id } });
    if (alreadyVoted) return res.status(409).json({ message: "Vous avez déjà voté" });

    // 7. Enregistrement (la contrainte unique protège aussi contre les doubles clics)
    const vote = await Vote.create({ poll_id, user_id, option_id: option.id });

    // 8. Recalcul des statistiques et diffusion aux clients de la room du sondage
    const votes = await loadVotes(poll_id);
    const { votesCount, counts } = calculatePollResults(poll, votes);

    io.to(`poll-${poll_id}`).emit("poll-updated", {
      pollId: poll_id,
      votesCount,
      counts,
      totalVotes: votes.length,
    });

    return res.status(201).json({ message: "Vote enregistré", vote });
  } catch (error) {
    console.error("Vote poll error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Vous avez déjà voté" });
    }
    return res.status(500).json({ message: "Échec de l'enregistrement du vote" });
  }
};
