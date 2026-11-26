import { Op } from "sequelize";
import { Poll, PollOption, Vote, User, Group } from "../models/index.js";
import { canAccessGroup, getAccessibleGroupIds } from "../lib/groupAccess.js";
import sequelize from "../lib/sequelize.js";
import { calculatePollResults } from "../utils/pollResults.js";
import { validateOptions, validateEndTime } from "../utils/pollValidation.js";

// Includes réutilisables : propositions + votes (avec le texte de l'option)
const optionsInclude = { model: PollOption, attributes: ["id", "option_text"] };
const votesInclude = {
  model: Vote,
  attributes: ["option_id", "user_id"],
  include: [{ model: PollOption, attributes: ["id", "option_text"] }],
};
// Groupe ciblé (et son parent) : permet d'afficher « DUT › DAIA »
const groupInclude = {
  model: Group,
  attributes: ["id", "name", "parent_id"],
  include: [{ model: Group, as: "parent", attributes: ["id", "name"] }],
};
const optionsOrder = [[PollOption, "id", "ASC"]];

const isAdmin = (user) => user?.role === "admin";
const isOwner = (poll, user) => Number(poll.created_by) === Number(user.id);

const loadPoll = (id, extraInclude = []) =>
  Poll.findByPk(id, {
    include: [optionsInclude, groupInclude, ...extraInclude],
    order: optionsOrder,
  });

export const createPoll = async (req, res) => {
  try {
    const { question, options, end_time, category, creation_mode, group_id } = req.body;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ message: "La question est obligatoire" });
    }

    const { error: optError, clean } = validateOptions(options);
    if (optError) return res.status(400).json({ message: optError });

    if (!["sondage", "vote"].includes(category)) {
      return res.status(400).json({ message: "Catégorie invalide" });
    }

    const { error: timeError, date } = validateEndTime(end_time);
    if (timeError) return res.status(400).json({ message: timeError });

    const mode = creation_mode === "ai" ? "ai" : "manual";

    // Groupe cible (facultatif) : vide = sondage public.
    let groupId = null;
    if (group_id !== undefined && group_id !== null && group_id !== "") {
      groupId = Number(group_id);
      if (!Number.isInteger(groupId) || !(await Group.findByPk(groupId))) {
        return res.status(400).json({ message: "Groupe invalide" });
      }
      if (!(await canAccessGroup(req.user, groupId))) {
        return res.status(403).json({ message: "Vous ne faites pas partie de ce groupe" });
      }
    }

    const pollId = await sequelize.transaction(async (transaction) => {
      // Tout nouveau sondage est un brouillon : il doit être validé puis publié.
      const poll = await Poll.create(
        {
          question: question.trim(),
          end_time: date,
          category,
          created_by: req.user.id,
          group_id: groupId,
          status: "draft",
          creation_mode: mode,
        },
        { transaction }
      );
      await PollOption.bulkCreate(
        clean.map((option_text) => ({ poll_id: poll.id, option_text })),
        { transaction }
      );
      return poll.id;
    });

    const poll = await loadPoll(pollId);
    return res.status(201).json({
      message: "Sondage créé en brouillon. Validez-le puis publiez-le.",
      poll: poll.toJSON(),
    });
  } catch (error) {
    console.error("Create poll error:", error);
    return res.status(500).json({ message: "Échec de la création du sondage" });
  }
};

// Liste publique : sondages publiés + clôturés (pour voir les résultats finaux)
export const getPolls = async (req, res) => {
  try {
    const where = { status: ["published", "closed"] };

    // Sondages de groupe : visibles uniquement par les membres (et les admins).
    // Les visiteurs non connectés ne voient que les sondages publics.
    if (req.user?.role !== "admin") {
      const groupIds = req.user ? [...(await getAccessibleGroupIds(req.user.id))] : [];
      where[Op.or] = [{ group_id: null }, ...(groupIds.length ? [{ group_id: groupIds }] : [])];
    }

    const polls = await Poll.findAll({
      where,
      include: [{ model: User, attributes: ["id", "fullName"] }, optionsInclude, groupInclude],
      order: [["createdAt", "DESC"], optionsOrder[0]],
    });
    return res.json(polls.map((p) => p.toJSON()));
  } catch (error) {
    console.error("Get polls error:", error);
    return res.status(500).json({ message: "Échec de la récupération des sondages" });
  }
};

export const getPoll = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const poll = await loadPoll(req.params.id, [
      { model: User, attributes: ["id", "fullName"] },
      votesInclude,
    ]);

    if (!poll) return res.status(404).json({ message: "Sondage introuvable" });

    if (poll.status === "draft" && !isOwner(poll, req.user) && !isAdmin(req.user)) {
      return res.status(404).json({ message: "Sondage introuvable" });
    }

    if (!isOwner(poll, req.user) && !(await canAccessGroup(req.user, poll.group_id))) {
      return res.status(403).json({
        message: `Ce sondage est réservé aux membres du groupe « ${poll.Group?.name || ""} ». Rejoignez-le depuis la page Groupes.`,
        group: poll.Group ? { id: poll.Group.id, name: poll.Group.name } : null,
      });
    }

    const parsedPoll = poll.toJSON();

    const userVote =
      parsedPoll.Votes.find((v) => Number(v.user_id) === userId)?.PollOption?.option_text ||
      parsedPoll.Votes.find((v) => Number(v.user_id) === userId)?.option_selected ||
      null;

    const isClosed =
      parsedPoll.status === "closed" || new Date(parsedPoll.end_time) <= new Date();

    const { votesCount, counts, totalVotes, winner } = calculatePollResults(
      parsedPoll,
      parsedPoll.Votes
    );

    // On ne renvoie jamais la liste brute des votes (elle révélerait les résultats
    // d'un "vote" avant la clôture et l'identité des votants).
    const { Votes: _votes, ...publicPoll } = parsedPoll;

    return res.json({ ...publicPoll, userVote, votesCount, counts, totalVotes, winner, isClosed });
  } catch (error) {
    console.error("Get poll error:", error);
    return res.status(500).json({ message: "Échec de la récupération du sondage" });
  }
};

export const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ message: "Sondage introuvable" });

    if (!isOwner(poll, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Action non autorisée" });
    }

    await poll.destroy();
    return res.json({ message: "Sondage supprimé" });
  } catch (error) {
    console.error("Delete poll error:", error);
    return res.status(500).json({ message: "Échec de la suppression du sondage" });
  }
};

export const getUserPoll = async (req, res) => {
  try {
    const polls = await Poll.findAll({
      where: { created_by: req.user.id },
      include: [optionsInclude, votesInclude, groupInclude],
      order: [["createdAt", "DESC"], optionsOrder[0]],
    });

    const pollsWithResults = polls.map((poll) => {
      const parsedPoll = poll.toJSON();
      const { votesCount, winner } = calculatePollResults(parsedPoll, parsedPoll.Votes);
      return { ...parsedPoll, votesCount, winner };
    });

    return res.status(200).json({ polls: pollsWithResults });
  } catch (error) {
    console.error("Get user polls error:", error);
    return res.status(500).json({ message: "Échec de la récupération de vos sondages" });
  }
};

// Modification : propriétaire (ou admin), uniquement si aucun vote n'a été enregistré.
export const updatePoll = async (req, res) => {
  try {
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ message: "Sondage introuvable" });
    if (!isOwner(poll, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Action non autorisée" });
    }
    if (poll.status === "closed" || new Date(poll.end_time) <= new Date()) {
      return res.status(409).json({ message: "Un sondage clôturé ne peut pas être modifié" });
    }

    const { question, options, end_time, category } = req.body;

    if (question !== undefined && (typeof question !== "string" || !question.trim())) {
      return res.status(400).json({ message: "La question est obligatoire" });
    }

    let cleanOptions;
    if (options !== undefined) {
      const { error, clean } = validateOptions(options);
      if (error) return res.status(400).json({ message: error });
      cleanOptions = clean;
    }

    if (category !== undefined && !["sondage", "vote"].includes(category)) {
      return res.status(400).json({ message: "Catégorie invalide" });
    }

    let endDate;
    if (end_time !== undefined) {
      const { error, date } = validateEndTime(end_time);
      if (error) return res.status(400).json({ message: error });
      endDate = date;
    }

    if ((await Vote.count({ where: { poll_id: poll.id } })) > 0) {
      return res.status(409).json({
        message: "Un sondage ayant déjà reçu des votes ne peut pas être modifié",
      });
    }

    await sequelize.transaction(async (transaction) => {
      const updates = {};
      if (question !== undefined) updates.question = question.trim();
      if (category !== undefined) updates.category = category;
      if (endDate) updates.end_time = endDate;
      if (Object.keys(updates).length) await poll.update(updates, { transaction });

      if (cleanOptions) {
        await PollOption.destroy({ where: { poll_id: poll.id }, transaction });
        await PollOption.bulkCreate(
          cleanOptions.map((option_text) => ({ poll_id: poll.id, option_text })),
          { transaction }
        );
      }
    });

    const updated = await loadPoll(poll.id);
    return res.json({ message: "Sondage modifié", poll: updated.toJSON() });
  } catch (error) {
    console.error("Update poll error:", error);
    return res.status(500).json({ message: "Échec de la modification du sondage" });
  }
};

// Validation / publication : { status: "published" } ou { status: "draft" }.
// Autorisé pour le propriétaire du sondage et pour les administrateurs.
export const setPollStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const poll = await loadPoll(req.params.id);
    if (!poll) return res.status(404).json({ message: "Sondage introuvable" });

    if (!isOwner(poll, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: "Action non autorisée" });
    }

    if (poll.status === "closed" || new Date(poll.end_time) <= new Date()) {
      return res.status(409).json({ message: "Un sondage expiré ne peut pas être modifié" });
    }

    if (status === "published" && poll.options.length < 2) {
      return res.status(400).json({ message: "Au moins 2 propositions sont requises" });
    }

    if (status === "draft" && (await Vote.count({ where: { poll_id: poll.id } })) > 0) {
      return res.status(409).json({
        message: "Un sondage ayant reçu des votes ne peut plus être dépublié",
      });
    }

    await poll.update({ status });

    return res.json({
      message: status === "published" ? "Sondage publié" : "Sondage enregistré en brouillon",
      poll: poll.toJSON(),
    });
  } catch (error) {
    console.error("Set poll status error:", error);
    return res.status(500).json({ message: "Échec de la mise à jour du statut" });
  }
};

export const getPollsForAdminReview = async (req, res) => {
  try {
    const polls = await Poll.findAll({
      where: { status: "draft" },
      include: [{ model: User, attributes: ["id", "fullName", "email"] }, optionsInclude, groupInclude],
      order: [["updatedAt", "ASC"], optionsOrder[0]],
    });
    return res.json(polls.map((p) => p.toJSON()));
  } catch (error) {
    console.error("Admin review list error:", error);
    return res.status(500).json({ message: "Échec de la récupération des brouillons" });
  }
};

// Admin : tous les sondages (brouillons, publiés, clôturés) de tous les utilisateurs
export const getAllPollsAdmin = async (req, res) => {
  try {
    const polls = await Poll.findAll({
      include: [
        { model: User, attributes: ["id", "fullName", "email"] },
        optionsInclude,
        groupInclude,
        votesInclude,
      ],
      order: [["createdAt", "DESC"], optionsOrder[0]],
    });

    const result = polls.map((poll) => {
      const parsedPoll = poll.toJSON();
      const { votesCount, winner } = calculatePollResults(parsedPoll, parsedPoll.Votes);
      return { ...parsedPoll, votesCount, winner };
    });

    return res.json({ polls: result });
  } catch (error) {
    console.error("Admin all polls error:", error);
    return res.status(500).json({ message: "Échec de la récupération des sondages" });
  }
};
