import { Op } from "sequelize";
import sequelize from "../lib/sequelize.js";
import { io } from "../lib/socket.js";
import { calculatePollResults, loadVotes } from "../utils/pollResults.js";
import { User, Poll, PollOption, Vote, Group, GroupMember } from "../models/index.js";

const PAGE_SIZE = 20;

const pageParams = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  return { page, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
};

const countBy = async (Model, field, ids) => {
  if (!ids.length) return new Map();
  const rows = await Model.findAll({
    where: { [field]: ids },
    attributes: [field, [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    group: [field],
    raw: true,
  });
  return new Map(rows.map((r) => [Number(r[field]), Number(r.count)]));
};

// GET /api/admin/stats : chiffres du tableau de bord admin
export const getStats = async (req, res) => {
  try {
    const [users, polls, votes, groups, pendingRequests, admins] = await Promise.all([
      User.count(),
      Poll.count(),
      Vote.count(),
      Group.count(),
      GroupMember.count({ where: { status: "pending" } }),
      User.count({ where: { role: "admin" } }),
    ]);
    return res.json({ users, admins, polls, votes, groups, pendingRequests });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ message: "Échec du chargement des statistiques" });
  }
};

// GET /api/admin/users?search=&role=&page=
export const listUsers = async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const where = {};

    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (["user", "admin"].includes(req.query.role)) where.role = req.query.role;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ["id", "fullName", "email", "role", "image", "authProvider", "isEmailVerified", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const ids = rows.map((u) => u.id);
    const [votesOf, pollsOf] = await Promise.all([
      countBy(Vote, "user_id", ids),
      countBy(Poll, "created_by", ids),
    ]);

    return res.json({
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
      users: rows.map((u) => ({
        ...u.toJSON(),
        votesCount: votesOf.get(Number(u.id)) || 0,
        pollsCount: pollsOf.get(Number(u.id)) || 0,
      })),
    });
  } catch (error) {
    console.error("Admin list users error:", error);
    return res.status(500).json({ message: "Échec du chargement des utilisateurs" });
  }
};

// PATCH /api/admin/users/:id/role  { role: "user" | "admin" }
export const setUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
    }

    const target = await User.findByPk(req.params.id);
    if (!target) return res.status(404).json({ message: "Utilisateur introuvable" });

    await target.update({ role });
    return res.json({
      message: role === "admin" ? `${target.fullName} est maintenant administrateur` : `${target.fullName} est maintenant utilisateur`,
      role,
    });
  } catch (error) {
    console.error("Admin set role error:", error);
    return res.status(500).json({ message: "Échec de la modification du rôle" });
  }
};

// DELETE /api/admin/users/:id : supprime le compte (sondages, votes, messages en cascade)
export const deleteUser = async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte ici" });
    }
    const target = await User.findByPk(req.params.id);
    if (!target) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Ses sondages de groupe ou publics disparaissent aussi : on garde au moins un admin
    if (target.role === "admin" && (await User.count({ where: { role: "admin" } })) <= 1) {
      return res.status(400).json({ message: "Impossible de supprimer le dernier administrateur" });
    }

    await sequelize.transaction(async (transaction) => {
      await GroupMember.destroy({ where: { user_id: target.id }, transaction });
      await target.destroy({ transaction });
    });
    return res.json({ message: "Utilisateur supprimé" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return res.status(500).json({ message: "Échec de la suppression de l'utilisateur" });
  }
};

// GET /api/admin/votes?search=&poll_id=&page=
export const listVotes = async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const where = {};
    if (req.query.poll_id) where.poll_id = Number(req.query.poll_id) || 0;

    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    const include = [
      { model: User, attributes: ["id", "fullName", "email"], required: !!search },
      { model: Poll, attributes: ["id", "question", "status", "category", "end_time"], required: !!search },
      { model: PollOption, attributes: ["id", "option_text"] },
    ];
    if (search) {
      where[Op.or] = [
        { "$User.fullName$": { [Op.like]: `%${search}%` } },
        { "$User.email$": { [Op.like]: `%${search}%` } },
        { "$Poll.question$": { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Vote.findAndCountAll({
      where,
      include,
      order: [["voted_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
      votes: rows.map((v) => ({
        id: v.id,
        voted_at: v.voted_at,
        option: v.PollOption?.option_text || null,
        user: v.User ? { id: v.User.id, fullName: v.User.fullName, email: v.User.email } : null,
        poll: v.Poll
          ? { id: v.Poll.id, question: v.Poll.question, status: v.Poll.status, category: v.Poll.category }
          : null,
      })),
    });
  } catch (error) {
    console.error("Admin list votes error:", error);
    return res.status(500).json({ message: "Échec du chargement des votes" });
  }
};

// DELETE /api/admin/votes/:id : annule un vote (l'utilisateur pourra revoter si le sondage est ouvert)
export const deleteVote = async (req, res) => {
  try {
    const vote = await Vote.findByPk(req.params.id);
    if (!vote) return res.status(404).json({ message: "Vote introuvable" });

    const pollId = vote.poll_id;
    await vote.destroy();

    // Mise à jour en direct des résultats pour les participants connectés
    const poll = await Poll.findByPk(pollId, {
      include: [{ model: PollOption, attributes: ["id", "option_text"] }],
    });
    if (poll) {
      const votes = await loadVotes(pollId);
      const { votesCount, counts } = calculatePollResults(poll, votes);
      io.to(`poll-${pollId}`).emit("poll-updated", {
        pollId,
        votesCount,
        counts,
        totalVotes: votes.length,
      });
    }

    return res.json({ message: "Vote supprimé" });
  } catch (error) {
    console.error("Admin delete vote error:", error);
    return res.status(500).json({ message: "Échec de la suppression du vote" });
  }
};
