import { Vote, PollOption } from "../models/index.js";

// Charge les votes d'un sondage avec le texte de l'option choisie.
export const loadVotes = (pollId) =>
  Vote.findAll({
    where: { poll_id: pollId },
    include: [{ model: PollOption, attributes: ["id", "option_text"] }],
  });

// Retourne le texte choisi, que le vote soit une instance Sequelize ou un objet JSON.
const getSelectedOption = (vote) =>
  vote?.option_selected ?? vote?.PollOption?.option_text ?? null;

// Calculs statistiques faits côté application à partir des données MySQL.
export const calculatePollResults = (poll, votes) => {
  const parsedPoll = poll.toJSON ? poll.toJSON() : poll;
  const totalVotes = votes.length;

  let votesCount = {}; // pourcentages (texte, 1 décimale)
  let counts = {}; // nombre de votes par proposition
  let winner = [];

  const isClosed =
    parsedPoll.status === "closed" || new Date(parsedPoll.end_time) <= new Date();

  if (parsedPoll.category === "sondage" || isClosed) {
    parsedPoll.options.forEach((opt) => {
      const count = votes.filter((v) => getSelectedOption(v) === opt).length;
      counts[opt] = count;
      votesCount[opt] = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
    });
  }

  if (parsedPoll.category === "vote" && isClosed) {
    const countMap = {};
    votes.forEach((v) => {
      const option = getSelectedOption(v);
      if (option) countMap[option] = (countMap[option] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(countMap), 0);
    winner = Object.keys(countMap).filter((opt) => countMap[opt] === maxVotes);
  }

  return { votesCount, counts, totalVotes, winner };
};
