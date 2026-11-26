import { Poll, PollOption, User } from "../models/index.js";
import { calculatePollResults, loadVotes } from "../utils/pollResults.js";
import { canAccessGroup } from "../lib/groupAccess.js";

export const getResults = async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ["id", "email", "fullName"] },
        { model: PollOption, attributes: ["id", "option_text"] },
      ],
      order: [[PollOption, "id", "ASC"]],
    });

    if (!poll) return res.status(404).json({ message: "Sondage introuvable" });

    const privileged =
      req.user.role === "admin" || Number(poll.created_by) === Number(req.user.id);

    // Un brouillon n'est visible que par son créateur / un admin
    if (poll.status === "draft" && !privileged) {
      return res.status(404).json({ message: "Sondage introuvable" });
    }

    if (!privileged && !(await canAccessGroup(req.user, poll.group_id))) {
      return res.status(403).json({ message: "Ce sondage est réservé aux membres du groupe" });
    }

    const votes = await loadVotes(poll.id);
    const totalVotes = votes.length;
    const isClosed = poll.status === "closed" || new Date(poll.end_time) <= new Date();

    // Règle de visibilité : pour un "vote", les résultats ne sont publics qu'après la clôture
    const hidden = poll.category === "vote" && !isClosed && !privileged;

    const { votesCount, counts, winner } = calculatePollResults(poll, votes);

    const results = hidden
      ? []
      : poll.options.map((option) => {
          const count = votes.filter((v) => v.option_selected === option).length;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return { option_selected: option, count, percentage };
        });

    res.json({
      poll: poll.question,
      options: poll.options,
      category: poll.category,
      results,
      totalVotes,
      winner: hidden ? [] : winner,
      votesCount: hidden ? {} : votesCount,
      counts: hidden ? {} : counts,
      isClosed,
    });
  } catch (error) {
    console.error("Get results error:", error);
    res.status(500).json({ message: "Échec de la récupération des résultats" });
  }
};
