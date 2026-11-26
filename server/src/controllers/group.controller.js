import { Group, GroupMember, Poll, User } from "../models/index.js";
import sequelize from "../lib/sequelize.js";
import { getAccessibleGroupIds } from "../lib/groupAccess.js";

const NAME_MIN = 2;
const NAME_MAX = 80;

// Liste à plat (le client construit l'arbre groupe > sous-groupes).
export const listGroups = async (req, res) => {
  try {
    const countByStatus = (status) =>
      GroupMember.findAll({
        where: { status },
        attributes: ["group_id", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
        group: ["group_id"],
        raw: true,
      });

    const [groups, memberships, counts, pendingCounts] = await Promise.all([
      Group.findAll({ order: [["name", "ASC"]], raw: true }),
      GroupMember.findAll({ where: { user_id: req.user.id }, attributes: ["group_id", "status"], raw: true }),
      countByStatus("approved"),
      req.user.role === "admin" ? countByStatus("pending") : Promise.resolve([]),
    ]);

    const mine = new Set(memberships.filter((m) => m.status === "approved").map((m) => Number(m.group_id)));
    const pending = new Set(memberships.filter((m) => m.status === "pending").map((m) => Number(m.group_id)));
    const pendingCountOf = new Map(pendingCounts.map((c) => [Number(c.group_id), Number(c.count)]));
    const accessible = await getAccessibleGroupIds(req.user.id);
    const countOf = new Map(counts.map((c) => [Number(c.group_id), Number(c.count)]));

    return res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        parent_id: g.parent_id,
        memberCount: countOf.get(Number(g.id)) || 0,
        isMember: mine.has(Number(g.id)),
        isPending: pending.has(Number(g.id)),
        pendingCount: pendingCountOf.get(Number(g.id)) || 0,
        // accès = membre du groupe ou d'un de ses sous-groupes (voit les sondages du parent)
        hasAccess: req.user.role === "admin" || accessible.has(Number(g.id)),
      }))
    );
  } catch (error) {
    console.error("List groups error:", error);
    return res.status(500).json({ message: "Échec de la récupération des groupes" });
  }
};

// Admin : créer un groupe (sans parent_id) ou un sous-groupe (avec parent_id).
export const createGroup = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return res
        .status(400)
        .json({ message: `Le nom doit contenir entre ${NAME_MIN} et ${NAME_MAX} caractères` });
    }

    let parentId = null;
    if (req.body.parent_id !== undefined && req.body.parent_id !== null && req.body.parent_id !== "") {
      parentId = Number(req.body.parent_id);
      const parent = Number.isInteger(parentId) ? await Group.findByPk(parentId) : null;
      if (!parent) return res.status(400).json({ message: "Groupe parent introuvable" });
      if (parent.parent_id != null) {
        return res.status(400).json({ message: "Un sous-groupe ne peut pas avoir de sous-groupes" });
      }
    }

    const siblings = await Group.findAll({ where: { parent_id: parentId }, attributes: ["name"], raw: true });
    if (siblings.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ message: "Ce nom existe déjà à cet endroit" });
    }

    const group = await Group.create({ name, parent_id: parentId });
    return res.status(201).json({ message: "Groupe créé", group });
  } catch (error) {
    console.error("Create group error:", error);
    return res.status(500).json({ message: "Échec de la création du groupe" });
  }
};

// Admin : supprimer un groupe (et ses sous-groupes) s'il n'a aucun sondage.
export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: "Groupe introuvable" });

    const children = await Group.findAll({ where: { parent_id: group.id }, attributes: ["id"], raw: true });
    const ids = [group.id, ...children.map((c) => c.id)];

    if ((await Poll.count({ where: { group_id: ids } })) > 0) {
      return res.status(409).json({
        message: "Ce groupe contient des sondages : supprimez-les d'abord",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await GroupMember.destroy({ where: { group_id: ids }, transaction });
      await Group.destroy({ where: { id: children.map((c) => c.id) }, transaction });
      await group.destroy({ transaction });
    });

    return res.json({ message: "Groupe supprimé" });
  } catch (error) {
    console.error("Delete group error:", error);
    return res.status(500).json({ message: "Échec de la suppression du groupe" });
  }
};

// Un utilisateur demande à rejoindre : la demande reste « pending » jusqu'à validation par un admin.
// Un admin rejoint directement.
export const joinGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: "Groupe introuvable" });

    const status = req.user.role === "admin" ? "approved" : "pending";
    const [membership, created] = await GroupMember.findOrCreate({
      where: { group_id: group.id, user_id: req.user.id },
      defaults: { status },
    });

    if (!created) {
      return res.json({
        message:
          membership.status === "approved"
            ? "Vous êtes déjà membre de ce groupe"
            : "Votre demande est déjà en attente de validation",
      });
    }
    return res.status(201).json({
      message:
        status === "approved"
          ? `Vous avez rejoint « ${group.name} »`
          : `Demande envoyée pour « ${group.name} » : un administrateur doit la valider`,
    });
  } catch (error) {
    console.error("Join group error:", error);
    return res.status(500).json({ message: "Impossible de rejoindre le groupe" });
  }
};

// Quitter le groupe ou annuler sa demande en attente.
export const leaveGroup = async (req, res) => {
  try {
    await GroupMember.destroy({ where: { group_id: req.params.id, user_id: req.user.id } });
    return res.json({ message: "Vous avez quitté le groupe (ou annulé votre demande)" });
  } catch (error) {
    console.error("Leave group error:", error);
    return res.status(500).json({ message: "Impossible de quitter le groupe" });
  }
};

// ---------- Admin : demandes d'adhésion ----------

export const listRequests = async (req, res) => {
  try {
    const rows = await GroupMember.findAll({
      where: { status: "pending" },
      include: [
        { model: User, attributes: ["id", "fullName", "email"] },
        {
          model: Group,
          attributes: ["id", "name", "parent_id"],
          include: [{ model: Group, as: "parent", attributes: ["id", "name"] }],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    // Groupes dont chaque demandeur est déjà membre (aide l'admin à décider)
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const memberships = userIds.length
      ? await GroupMember.findAll({
          where: { user_id: userIds, status: "approved" },
          include: [
            {
              model: Group,
              attributes: ["id", "name"],
              include: [{ model: Group, as: "parent", attributes: ["id", "name"] }],
            },
          ],
        })
      : [];
    const currentGroups = new Map();
    for (const m of memberships) {
      if (!m.Group) continue;
      const list = currentGroups.get(Number(m.user_id)) || [];
      list.push({ id: m.Group.id, name: m.Group.name, parentName: m.Group.parent?.name || null });
      currentGroups.set(Number(m.user_id), list);
    }

    return res.json(
      rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        currentGroups: currentGroups.get(Number(r.user_id)) || [],
        user: r.User ? { id: r.User.id, fullName: r.User.fullName, email: r.User.email } : null,
        group: r.Group
          ? { id: r.Group.id, name: r.Group.name, parentName: r.Group.parent?.name || null }
          : null,
      }))
    );
  } catch (error) {
    console.error("List requests error:", error);
    return res.status(500).json({ message: "Échec de la récupération des demandes" });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const request = await GroupMember.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Demande introuvable" });
    if (request.status !== "approved") await request.update({ status: "approved" });
    return res.json({ message: "Demande acceptée" });
  } catch (error) {
    console.error("Approve request error:", error);
    return res.status(500).json({ message: "Échec de la validation" });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const deleted = await GroupMember.destroy({
      where: { id: req.params.id, status: "pending" },
    });
    if (!deleted) return res.status(404).json({ message: "Demande introuvable" });
    return res.json({ message: "Demande refusée" });
  } catch (error) {
    console.error("Reject request error:", error);
    return res.status(500).json({ message: "Échec du refus" });
  }
};

// ---------- Admin : gérer les membres d'un groupe ----------

export const listMembers = async (req, res) => {
  try {
    const rows = await GroupMember.findAll({
      where: { group_id: req.params.id, status: "approved" },
      include: [{ model: User, attributes: ["id", "fullName", "email"] }],
      order: [["createdAt", "ASC"]],
    });
    return res.json(
      rows
        .filter((r) => r.User)
        .map((r) => ({ id: r.User.id, fullName: r.User.fullName, email: r.User.email }))
    );
  } catch (error) {
    console.error("List members error:", error);
    return res.status(500).json({ message: "Échec de la récupération des membres" });
  }
};

// Retire un membre : il perd l'accès aux sondages du groupe. Ses votes déjà enregistrés sont conservés.
export const removeMember = async (req, res) => {
  try {
    const deleted = await GroupMember.destroy({
      where: { group_id: req.params.id, user_id: req.params.userId },
    });
    if (!deleted) return res.status(404).json({ message: "Membre introuvable dans ce groupe" });
    return res.json({ message: "Membre retiré du groupe" });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({ message: "Échec du retrait du membre" });
  }
};
